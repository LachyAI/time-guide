"use client";

import { useEffect, useRef, useState } from "react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { useVoiceSession } from "@/components/VoiceSession";
import type { Agent } from "@/lib/agents";

interface VoiceSessionScreenProps {
  agent: Agent;
  onBack: () => void;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceSessionScreen({ agent, onBack }: VoiceSessionScreenProps) {
  const { status, isSpeaking, messages, startedAt, getInputLevel, start, stop } =
    useVoiceSession(agent.id);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting" || status === "disconnecting";

  // --- session timer ---
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(formatElapsed(Date.now() - startedAt)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // --- live input-level ring (rAF drives a CSS var; no re-renders) ---
  const micContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isConnected) {
      micContainerRef.current?.style.setProperty("--input-level", "0");
      return;
    }
    let raf: number;
    const tick = () => {
      const level = isSpeaking ? 0 : getInputLevel();
      micContainerRef.current?.style.setProperty("--input-level", level.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isConnected, isSpeaking, getInputLevel]);

  // --- captions autoscroll ---
  const captionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    captionsRef.current?.scrollTo({ top: captionsRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleBack = async () => {
    if (isConnected) await stop();
    onBack();
  };

  const handleToggle = () => {
    if (isConnected) stop();
    else if (!isConnecting) start();
  };

  return (
    <main
      className="voice-session-screen"
      style={{ "--agent-color": agent.color } as React.CSSProperties}
    >
      <CosmicBackground />
      <button onClick={handleBack} className="back-button">
        ← back
      </button>

      {(isConnected || startedAt) && (
        <span className="session-timer" aria-label="Session length">
          {elapsed}
        </span>
      )}

      <div className="session-header">
        <span className="session-icon">{agent.icon}</span>
        <h1 className="session-name">{agent.name}</h1>
        <p className="session-tagline">{agent.description}</p>
      </div>

      <div className="mic-container" ref={micContainerRef}>
        {isSpeaking && <div className="pulse-ring" />}
        {isSpeaking && <div className="pulse-ring pulse-ring-2" />}
        {isConnected && !isSpeaking && <div className="level-ring" />}
        {isConnected && !isSpeaking && <div className="breathe-ring" />}

        <button
          onClick={handleToggle}
          disabled={isConnecting}
          className={[
            "mic-button",
            isConnected ? "mic-active" : "",
            isConnecting ? "mic-loading" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={isConnected ? "End session" : "Start session"}
        >
          {isConnected ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h-3v2h8v-2h-3v-2.06A9 9 0 0 0 21 12v-2h-2z" />
            </svg>
          )}
        </button>
      </div>

      <p className="session-status">
        {isConnecting && "connecting..."}
        {isConnected && isSpeaking && "speaking"}
        {isConnected && !isSpeaking && "listening"}
        {!isConnected && !isConnecting && (messages.length ? "session ended" : "tap to begin")}
      </p>

      {messages.length > 0 && (
        <div className="captions" ref={captionsRef} aria-live="polite">
          {messages.map((m) => (
            <p key={m.id} className={`caption-line caption-${m.role}`}>
              <span className="caption-who">{m.role === "user" ? "you" : agent.name.toLowerCase()}</span>
              {m.text}
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
