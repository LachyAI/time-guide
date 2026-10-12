"use client";

import { useEffect, useRef, useState } from "react";
import { fetchSample, fetchVoices, setAgentVoice, type Voice } from "@/lib/voiceBrain";
import { createPlayer, type Player } from "@/lib/live/player";

interface VoicePickerProps {
  slug: string;
  current: string | null;
  onChange: (voice: string) => void;
}

// His shortlist first, then Flux (the more natural engine), then the rest. Changes apply from the next session.
export function VoicePicker({ slug, current, onChange }: VoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const player = useRef<Player | null>(null);
  const playToken = useRef(0);

  useEffect(() => {
    if (open && !voices.length) fetchVoices().then(setVoices).catch(() => setError("couldn't load the voices"));
  }, [open, voices.length]);

  useEffect(() => () => {
    player.current?.stop();
    ctx.current?.close().catch(() => {});
  }, []);

  const label = voices.find((v) => v.id === current)?.name ?? (current ? current.replace(/^(flux|aura-2)-/, "").replace(/-en$/, "") : "default");
  const sorted = [...voices].sort(
    (a, b) => Number(b.shortlist) - Number(a.shortlist) || Number(b.engine === "Flux") - Number(a.engine === "Flux") || Number(b.featured) - Number(a.featured),
  );

  const preview = async (id: string) => {
    const token = ++playToken.current;
    if (!ctx.current) ctx.current = new AudioContext();
    await ctx.current.resume();
    player.current?.stop();
    player.current = createPlayer(ctx.current);
    setBusy(id);
    setError(null);
    try {
      const res = await fetchSample(id);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done || token !== playToken.current) break;
        player.current.play(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
      }
    } catch {
      setError("couldn't play that voice");
    }
    setBusy(null);
  };

  const choose = async (id: string) => {
    try {
      await setAgentVoice(slug, id);
      onChange(id);
      setOpen(false);
    } catch {
      setError("couldn't save the voice");
    }
  };

  return (
    <>
      <button className="voice-chip" onClick={() => setOpen(true)}>voice: {label} ▾</button>
      {open && (
        <div className="voice-sheet" role="dialog" aria-label="Choose a voice">
          <div className="voice-sheet-head">
            <span>Voice from your next session</span>
            <button onClick={() => { playToken.current++; player.current?.stop(); setOpen(false); }}>done</button>
          </div>
          {error && <p className="voice-error">{error}</p>}
          <div className="voice-list">
            {sorted.map((v) => (
              <div key={v.id} className={`voice-row ${v.id === current ? "voice-current" : ""}`}>
                <button className="voice-play" onClick={() => preview(v.id)} aria-label={`Preview ${v.name}`}>
                  {busy === v.id ? "…" : "▶"}
                </button>
                <div className="voice-meta">
                  <span className="voice-name">{v.shortlist ? "★ " : ""}{v.name}</span>
                  <span className="voice-tags">{v.engine} · {v.accent} · {v.tags}</span>
                </div>
                <button className="voice-use" onClick={() => choose(v.id)} disabled={v.id === current}>
                  {v.id === current ? "current" : "use"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
