"use client";

import type { Agent } from "@/lib/agents";

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <button
      onClick={() => agent.available && onSelect(agent)}
      disabled={!agent.available}
      className="agent-card"
      style={{ "--agent-color": agent.color } as React.CSSProperties}
      aria-label={`Open ${agent.name}`}
    >
      <span className="agent-icon">{agent.icon}</span>

      <div className="agent-info">
        <h2 className="agent-name">{agent.name}</h2>
        <p className="agent-desc">{agent.description}</p>
      </div>

      {!agent.available && <span className="agent-badge">Soon</span>}
      {agent.available && <span className="agent-arrow">→</span>}
    </button>
  );
}
