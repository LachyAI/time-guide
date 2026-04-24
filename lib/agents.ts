export type Agent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  available: boolean;
  icon: string;
};

export const agents: Agent[] = [
  {
    id: "agent_8301kkhg5wmsfj6ax58fq8xkqyam",
    slug: "time-guide",
    name: "Time Guide",
    description: "Revisit moments in your life",
    color: "#F59E0B",
    available: true,
    icon: "◷",
  },
  {
    id: "agent_4301kkhkt0adfn0vyh25fmefpwk0",
    slug: "future-self",
    name: "Future Self",
    description: "Talk to a wiser version of you",
    color: "#06B6D4",
    available: true,
    icon: "◈",
  },
  {
    id: "agent_4301kkhkpa1bfvq8wwdpzhmq1ktx",
    slug: "stoic-advisor",
    name: "Stoic Advisor",
    description: "Ancient wisdom for modern problems",
    color: "#8B5CF6",
    available: true,
    icon: "Ψ",
  },
  {
    id: "agent_2201kkhksgb1fvftrn3f00134evm",
    slug: "content-sparring",
    name: "Content Sparring",
    description: "Test your ideas before you publish",
    color: "#10B981",
    available: true,
    icon: "⟡",
  },
  {
    id: "agent_8201kkhkpwbwez9ve74na1ra19k7",
    slug: "sales-coach",
    name: "Sales Coach",
    description: "Practice pitches, handle objections",
    color: "#F97316",
    available: true,
    icon: "◎",
  },
  {
    id: "agent_4601kkhktg7sek2r4c9ny1egz232",
    slug: "weekly-review",
    name: "Weekly Review",
    description: "Sunday debrief saved to Notion",
    color: "#3B82F6",
    available: true,
    icon: "◳",
  },
  {
    id: "agent_6101kkhkvaacetgvh0rwk6hf69xf",
    slug: "thai-tutor",
    name: "Thai Tutor",
    description: "Immersive conversation practice",
    color: "#EC4899",
    available: true,
    icon: "ก",
  },
  {
    id: "agent_6501kkhkqprxfkxr71sqx11faaef",
    slug: "negotiation-trainer",
    name: "Negotiation",
    description: "Play hardball with a difficult counterpart",
    color: "#EF4444",
    available: true,
    icon: "⚖",
  },
];
