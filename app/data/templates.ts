import { ConversationTemplate } from "../types";

export const CONVERSATION_TEMPLATES: ConversationTemplate[] = [
  {
    id: "important-decision",
    name: "Important Decision",
    description: "Get comprehensive analysis and risk assessment for major choices.",
    category: "decision-making",
    selectedAgents: ["strategic_analyst", "devils_advocate", "practical_realist", "research_synthesizer"],
    autoModeEnabled: true,
    startingPrompt: "What decision are you trying to make? Share the context and options you're considering.",
    icon: "🤔",
  },
  {
    id: "creative-brainstorm",
    name: "Creative Brainstorm",
    description: "Generate innovative ideas and explore possibilities.",
    category: "creative",
    selectedAgents: ["creative_ideator", "devils_advocate", "practical_realist"],
    autoModeEnabled: true,
    startingPrompt: "What are you trying to create or solve? Tell us about your goals and constraints.",
    icon: "🎨",
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Technical feedback, best practices, and architecture review.",
    category: "technical",
    selectedAgents: ["technical_expert", "strategic_analyst", "devils_advocate"],
    autoModeEnabled: true,
    startingPrompt: "Paste your code or describe what you're building.",
    icon: "💻",
  },
  {
    id: "investment-analysis",
    name: "Investment Analysis",
    description: "Evaluate financial opportunities with ROI and risk focus.",
    category: "research",
    selectedAgents: ["strategic_analyst", "devils_advocate", "financial_advisor", "research_synthesizer"],
    autoModeEnabled: true,
    startingPrompt: "What investment are you considering? Share the details.",
    icon: "📊",
  },
];
