"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationStatus, SessionMessage } from "@/components/VoiceSession";
import { liveUrl, lock } from "@/lib/voiceBrain";
import { createPlayer, type Player } from "@/lib/live/player";
import { MAX_RETRIES, retryDelay } from "@/lib/live/reconnect";

export type Latency = { turn: number; total: number; detect: number; server: number | null; net: number | null };

// No "ready" this long after connecting means the listening service never came up.
const READY_TIMEOUT_MS = 15_000;

export function useLiveSession(slug: string) {
  const [status, setStatus] = useState<ConversationStatus>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [interim, setInterim] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stateLine, setStateLine] = useState<string | null>(null);
  const [latency, setLatency] = useState<Latency[]>([]);
  const [bargeIn, setBargeInState] = useState(true);

  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const player = useRef<Player | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef("");
  const wantOpen = useRef(false);
  const retries = useRef(0);
  const nextId = useRef(0);
  const level = useRef(0);
  const floor = useRef(0.01);
  const lastLoudAt = useRef(0);
  const speechEndAt = useRef(0);
  const eotAt = useRef(0);
  const turn = useRef<number | null>(null);
  const replyActive = useRef(false);
  const dropping = useRef(false);
  const heard = useRef(new Map<number, { total: number; detect: number }>());
  const bargeInRef = useRef(true);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const everReady = useRef(false);
  const lastError = useRef<string | null>(null);
  const micLost = useRef<() => void>(() => {});

  const addMessage = (role: SessionMessage["role"], text: string) =>
    setMessages((m) => [...m, { role, text, id: nextId.current++ }]);

  // Joins what the phone measured (you stopped → she was audible) with the server's split, and reports it back.
  const recordLatency = (t: number, server: number | null) => {
    const h = heard.current.get(t);
    if (!h) return;
    const net = server == null ? null : Math.round(h.total - h.detect - server);
    setLatency((l) => [...l.filter((x) => x.turn !== t), { turn: t, total: h.total, detect: h.detect, server, net }].slice(-20));
    if (server != null && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "client_timing", turn: t, totalMs: h.total, detectMs: h.detect, serverMs: server, netMs: net }));
    }
  };

  const acquireWake = async () => {
    try {
      const lockSentinel = await navigator.wakeLock?.request("screen");
      if (lockSentinel) {
        wake.current = lockSentinel;
        lockSentinel.addEventListener("release", () => { if (wake.current === lockSentinel) wake.current = null; });
      }
    } catch { wake.current = null; }
  };

  const teardown = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (readyTimer.current) clearTimeout(readyTimer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    player.current?.stop();
    player.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    wake.current?.release().catch(() => {});
    wake.current = null;
    replyActive.current = false;
    setIsSpeaking(false);
  }, []);

  const onMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data !== "string") {
      if (dropping.current || !player.current) return;
      const audibleAt = player.current.play(e.data as ArrayBuffer);
      if (audibleAt != null && turn.current && speechEndAt.current) {
        heard.current.set(turn.current, { total: Math.round(audibleAt - speechEndAt.current), detect: Math.round(eotAt.current - speechEndAt.current) });
        recordLatency(turn.current, null);
      }
      return;
    }
    const m = JSON.parse(e.data);
    switch (m.type) {
      case "ready":
      case "reconnected":
        retries.current = 0;
        everReady.current = true;
        if (readyTimer.current) clearTimeout(readyTimer.current);
        // A reply cut off by the drop is over; don't stay on "speaking" until the next one.
        replyActive.current = false;
        dropping.current = false;
        setStatus("connected");
        setStartedAt((s) => s ?? Date.now());
        setStateLine(null);
        break;
      case "transcript":
        setInterim(m.text);
        // The server only cuts her off while it is still sending audio, and her voice arrives faster than she
        // speaks, so the phone can still be playing a reply the server has finished. Talking over her stops it here.
        if (m.event === "StartOfTurn" && bargeInRef.current && player.current?.playing()) {
          player.current.stop();
          dropping.current = true;
          replyActive.current = false;
          setStateLine(null);
        }
        break;
      case "eot":
        eotAt.current = performance.now();
        speechEndAt.current = lastLoudAt.current;
        setInterim("");
        addMessage("user", m.transcript);
        setStateLine("thinking");
        break;
      case "reply_start":
        turn.current = m.turn;
        replyActive.current = true;
        dropping.current = false;
        player.current?.newTurn();
        break;
      case "reply_text":
        addMessage("agent", m.text);
        break;
      case "reply_end":
        replyActive.current = false;
        setStateLine(null);
        break;
      case "stop":
        player.current?.stop();
        dropping.current = true;
        replyActive.current = false;
        setStateLine(null);
        break;
      case "timing":
        recordLatency(m.turn, m.firstAudioSent ?? null);
        break;
      case "error":
        lastError.current = m.message;
        setStateLine(m.message === "voice failed" ? "voice failed, the reply is on screen" : m.message);
        break;
      case "ended":
        wantOpen.current = false;
        setStateLine("ended after 3 minutes of silence");
        break;
    }
  }, []);

  const connect = useCallback(() => {
    const url = liveUrl(slug, session.current, { bargeIn: bargeInRef.current });
    if (!url) { wantOpen.current = false; teardown(); setStatus("disconnected"); lock(); return; }
    const sock = new WebSocket(url);
    sock.binaryType = "arraybuffer";
    ws.current = sock;
    sock.onmessage = onMessage;
    if (readyTimer.current) clearTimeout(readyTimer.current);
    readyTimer.current = setTimeout(() => {
      if (ws.current !== sock || !wantOpen.current) return;
      if (everReady.current) { sock.close(); return; } // a reconnect attempt that hangs: let the retry path take over
      ws.current = null;
      wantOpen.current = false;
      sock.close();
      teardown(); setStatus("disconnected");
      setStateLine("couldn't reach the listening service");
    }, READY_TIMEOUT_MS);
    sock.onclose = (ev) => {
      if (ws.current !== sock) return;
      ws.current = null;
      if (ev.code === 1008) {
        wantOpen.current = false; teardown(); setStatus("disconnected");
        if (ev.reason === "bad ticket") lock(); else setStateLine(`refused: ${ev.reason}`);
        return;
      }
      if (ev.code === 1011) {
        wantOpen.current = false; teardown(); setStatus("disconnected");
        setStateLine(lastError.current || ev.reason || "voice service error"); // the server's error message says why
        return;
      }
      if (wantOpen.current && retries.current < MAX_RETRIES) {
        const wait = retryDelay(retries.current++);
        setStateLine("reconnecting");
        retryTimer.current = setTimeout(() => { if (wantOpen.current) connect(); }, wait);
        return;
      }
      const gaveUp = wantOpen.current;
      wantOpen.current = false; teardown(); setStatus("disconnected");
      if (gaveUp) setStateLine("connection lost");
    };
  }, [slug, onMessage, teardown]);

  const start = useCallback(async () => {
    if (wantOpen.current) return;
    wantOpen.current = true;
    retries.current = 0;
    everReady.current = false;
    lastError.current = null;
    heard.current.clear();
    setMessages([]); setInterim(""); setLatency([]); setStartedAt(null);
    setStatus("connecting"); setStateLine(null);
    session.current = crypto.randomUUID();
    try {
      const ac = new AudioContext({ latencyHint: "interactive" });
      ctx.current = ac;
      await ac.resume();
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      stream.current = mic;
      mic.getAudioTracks()[0]?.addEventListener("ended", () => micLost.current());
      await ac.audioWorklet.addModule("/audio/mic-worklet.js");
      const node = new AudioWorkletNode(ac, "mic");
      const mute = ac.createGain();
      mute.gain.value = 0;
      ac.createMediaStreamSource(mic).connect(node).connect(mute).connect(ac.destination);
      node.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; rms: number }>) => {
        const { pcm, rms } = e.data;
        level.current = rms;
        // Noise floor: drops fast to quiet frames, creeps up slowly, so speech stands out from room noise.
        floor.current = Math.max(0.002, rms < floor.current ? floor.current * 0.7 + rms * 0.3 : floor.current * 0.999 + rms * 0.001);
        if (rms > Math.max(0.012, floor.current * 3)) lastLoudAt.current = performance.now();
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm);
      };
      player.current = createPlayer(ac);
      await acquireWake();
      connect();
    } catch (err) {
      console.error("Failed to start live session:", err);
      wantOpen.current = false;
      teardown();
      setStatus("disconnected");
      setStateLine("couldn't start the microphone");
    }
  }, [connect, teardown]);

  const stop = useCallback(async () => {
    wantOpen.current = false;
    const sock = ws.current;
    ws.current = null;
    if (sock?.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "stop" }));
    setTimeout(() => sock?.close(), 300);
    teardown();
    setStatus("disconnected");
    setStateLine(null);
  }, [teardown]);

  useEffect(() => {
    micLost.current = () => { void stop(); setStateLine("microphone lost, tap to start again"); };
  }, [stop]);

  // She counts as speaking from reply_start until her audio has drained.
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setIsSpeaking(replyActive.current || Boolean(player.current?.playing())), 150);
    return () => clearInterval(t);
  }, [status]);

  // Coming back to the app: wake the audio, take the screen lock again, and reconnect at once if the socket dropped.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !wantOpen.current) return;
      // iOS can end the mic of a backgrounded app; the socket is fine but she would hear nothing.
      if (stream.current?.getAudioTracks()[0]?.readyState === "ended") { micLost.current(); return; }
      ctx.current?.resume().catch(() => {});
      if (!wake.current) acquireWake();
      if (!ws.current) {
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retries.current = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [connect]);

  // Leaving the screen ends and saves the session.
  useEffect(() => () => {
    if (!wantOpen.current) return;
    wantOpen.current = false;
    const sock = ws.current;
    ws.current = null;
    if (sock?.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "stop" }));
    sock?.close();
    teardown();
  }, [teardown]);

  const getInputLevel = useCallback(() => Math.min(1, level.current * 6), []);
  const interrupt = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "interrupt" }));
    player.current?.stop();
  }, []);
  const setBargeIn = useCallback((on: boolean) => { bargeInRef.current = on; setBargeInState(on); }, []);

  return { status, isSpeaking, messages, interim, startedAt, stateLine, latency, bargeIn, setBargeIn, interrupt, getInputLevel, start, stop };
}
