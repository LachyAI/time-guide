"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import { CosmicBackground } from "@/components/CosmicBackground";
import { LiveSessionScreen } from "@/components/LiveSessionScreen";
import { VoiceSessionScreen } from "@/components/VoiceSessionScreen";
import { agents, type Agent } from "@/lib/agents";
import { fetchAgents, type AgentConfig } from "@/lib/voiceBrain";

export default function Home() {
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [configs, setConfigs] = useState<Record<string, AgentConfig> | null>(null);

  // Which engine each agent runs on comes from voice-brain; if that call fails every agent stays on ElevenLabs.
  useEffect(() => {
    fetchAgents().then(setConfigs).catch(() => setConfigs({}));
  }, []);

  if (activeAgent) {
    const config = configs?.[activeAgent.slug];
    if (config?.engine === "live") {
      return (
        <LiveSessionScreen
          agent={activeAgent}
          config={config}
          onBack={() => setActiveAgent(null)}
          onConfigChange={(c) => setConfigs((all) => ({ ...(all ?? {}), [activeAgent.slug]: c }))}
        />
      );
    }
    return <VoiceSessionScreen agent={activeAgent} onBack={() => setActiveAgent(null)} />;
  }

  return (
    <main className="home-screen">
      <CosmicBackground />
      <header className="home-header">
        <div className="home-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="none" stroke="#4f46e5" strokeWidth="2.4" />
            <circle cx="12" cy="12" r="4.6" fill="#4f46e5" />
          </svg>
          <p className="home-eyebrow" style={{ margin: 0 }}>LACHY&#8202;&#8212;&#8202;OS</p>
        </div>
        <h1 className="home-title">Voice Agents</h1>
        <p className="home-subtitle">
          {agents.filter((a) => a.available).length} active ·{" "}
          {agents.filter((a) => !a.available).length} coming
        </p>
      </header>

      <div className="agent-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.slug} agent={agent} onSelect={configs ? setActiveAgent : () => {}} />
        ))}
      </div>
    </main>
  );
}
