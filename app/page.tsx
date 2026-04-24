"use client";

import { useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import { VoiceSessionScreen } from "@/components/VoiceSessionScreen";
import { agents, type Agent } from "@/lib/agents";

export default function Home() {
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  if (activeAgent) {
    return (
      <VoiceSessionScreen
        agent={activeAgent}
        onBack={() => setActiveAgent(null)}
      />
    );
  }

  return (
    <main className="home-screen">
      <header className="home-header">
        <p className="home-eyebrow">LACHY OS</p>
        <h1 className="home-title">Voice Agents</h1>
        <p className="home-subtitle">
          {agents.filter((a) => a.available).length} active ·{" "}
          {agents.filter((a) => !a.available).length} coming
        </p>
      </header>

      <div className="agent-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.slug} agent={agent} onSelect={setActiveAgent} />
        ))}
      </div>
    </main>
  );
}
