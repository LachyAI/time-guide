"use client";

import { useConversation } from "@11labs/react";
import { useCallback } from "react";

export type ConversationStatus =
  | "connected"
  | "connecting"
  | "disconnecting"
  | "disconnected";

export function useVoiceSession(agentId: string) {
  const conversation = useConversation({
    onError: (err: unknown) => console.error("Voice session error:", err),
  });

  const start = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId });
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [agentId, conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return {
    status: conversation.status as ConversationStatus,
    isSpeaking: conversation.isSpeaking,
    start,
    stop,
  };
}
