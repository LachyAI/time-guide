"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "lachy-os-auth";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated this session
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") setUnlocked(true);
    setReady(true);
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

      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, "true");
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
