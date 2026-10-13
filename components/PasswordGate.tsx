"use client";

import { useState, useEffect } from "react";
import { loadTicket, saveTicket } from "@/lib/session";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // A valid stored ticket means unlocked; voice-brain refusing it fires lachy-os-locked.
    setUnlocked(Boolean(loadTicket()));
    setReady(true);
    const relock = () => setUnlocked(false);
    window.addEventListener("lachy-os-locked", relock);
    return () => window.removeEventListener("lachy-os-locked", relock);
  }, []);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });

      const data = res.ok ? await res.json() : null;
      if (data?.ticket) {
        saveTicket({ ticket: data.ticket, exp: data.exp });
        setUnlocked(true);
      } else {
        setError(true);
        setShake(true);
        setInput("");
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-screen">
      <div className={`password-card ${shake ? "shake" : ""}`}>
        <p className="password-eyebrow">LACHY OS</p>
        <h1 className="password-title">Enter PIN</h1>

        <form onSubmit={handleSubmit} className="password-form">
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="••••"
            className={`password-input ${error ? "password-input-error" : ""}`}
            autoFocus
            autoComplete="current-password"
            disabled={loading}
          />
          {error && <p className="password-error">Incorrect</p>}
          <button type="submit" className="password-submit" disabled={loading}>
            {loading ? "..." : "Unlock →"}
          </button>
        </form>
      </div>
    </main>
  );
}
