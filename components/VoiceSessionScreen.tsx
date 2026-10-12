"use client";

import { SessionView } from "@/components/SessionView";
import { useVoiceSession } from "@/components/VoiceSession";
import type { Agent } from "@/lib/agents";

// Agents still on ElevenLabs (Future Self, Thai Tutor, or any agent flipped back in agents.json).
export function VoiceSessionScreen({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const session = useVoiceSession(agent.id);
  return <SessionView agent={agent} session={session} onBack={onBack} />;
}
