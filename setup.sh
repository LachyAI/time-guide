#!/bin/bash
# Run once after cloning to set your ElevenLabs agent ID
echo "NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${1:?Usage: ./setup.sh <your-agent-id>}" > .env.local
echo "✅ .env.local created"
