"use client";

import { useConversation } from "@11labs/react";
import { useCallback, useRef, useState } from "react";

export type ConversationStatus =
  | "connected"
  | "connecting"
  | "disconnecting"
  | "disconnected";

export type SessionMessage = {
  role: "user" | "agent";
  text: string;
  id: number;
};

export function useVoiceSession(agentId: string) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const nextId = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelBuf = useRef<Uint8Array | null>(null);

  const conversation = useConversation({
    onConnect: () => setStartedAt(Date.now()),
    onDisconnect: () => setStartedAt(null),
    onMessage: ({ message, source }: { message: string; source: string }) => {
      if (!message) return;
      setMessages((prev) => [
        ...prev,
        { role: source === "user" ? "user" : "agent", text: message, id: nextId.current++ },
      ]);
    },
    onError: (err: unknown) => console.error("Voice session error:", err),
  });

  const teardownAudio = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const start = useCallback(async () => {
    try {
      setMessages([]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // live input-level analyser on the mic stream
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      levelBuf.current = new Uint8Array(analyser.frequencyBinCount);
      await conversation.startSession({ agentId });
    } catch (err) {
      console.error("Failed to start session:", err);
      teardownAudio();
    }
  }, [agentId, conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    teardownAudio();
  }, [conversation]);

  /** Current mic input level 0..1 (RMS-ish). Call from a rAF loop. */
  const getInputLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const buf = levelBuf.current;
    if (!analyser || !buf) return 0;
    analyser.getByteFrequencyData(buf as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length) / 255;
    return Math.min(1, rms * 2.2);
  }, []);

  return {
    status: conversation.status as ConversationStatus,
    isSpeaking: conversation.isSpeaking,
    messages,
    startedAt,
    getInputLevel,
    start,
    stop,
  };
}
