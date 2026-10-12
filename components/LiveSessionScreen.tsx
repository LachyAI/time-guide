"use client";

import { SessionView } from "@/components/SessionView";
import { useLiveSession } from "@/lib/live/useLiveSession";
import type { Agent } from "@/lib/agents";
import type { AgentConfig } from "@/lib/voiceBrain";

interface LiveSessionScreenProps {
  agent: Agent;
  config: AgentConfig;
  onBack: () => void;
  onConfigChange: (config: AgentConfig) => void;
}

export function LiveSessionScreen({ agent, config, onBack, onConfigChange }: LiveSessionScreenProps) {
  const session = useLiveSession(agent.slug);
  const live = session.status !== "disconnected";
  const last = session.latency[session.latency.length - 1];
  const totals = session.latency.map((l) => l.total).sort((a, b) => a - b);
  const median = totals.length ? totals[Math.floor((totals.length - 1) / 2)] : null;

  return (
    <SessionView
      agent={agent}
      session={session}
      onBack={onBack}
      below={
        <div className="live-controls" data-config-voice={config.voice ?? ""} data-live={live ? "1" : "0"}>
          {live && session.isSpeaking && !session.bargeIn && (
            <button className="voice-chip" onClick={session.interrupt}>tap to cut in</button>
          )}
        </div>
      }
      debug={
        <div className="debug-panel">
          <p>
            you stopped → she started: {last ? `${last.total} ms` : "–"}
            {median != null ? ` · median ${median} ms (${totals.length})` : ""}
          </p>
          {last && <p>heard you {last.detect} ms · thinking + voice {last.server ?? "…"} ms · network + playback {last.net ?? "…"} ms</p>}
          {session.latency.length > 1 && <p>recent: {session.latency.map((l) => l.total).join(" · ")} ms</p>}
          <label>
            <input type="checkbox" checked={session.bargeIn} onChange={(e) => session.setBargeIn(e.target.checked)} /> cut her off by talking (applies next session)
          </label>
        </div>
      }
    />
  );
}
