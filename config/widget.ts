export type WidgetTheme = "light" | "dark" | "system";

export type WidgetConfig = {
  name: string;
  description: string;
  launcherLabel: string;
  placeholder: string;
  theme: WidgetTheme;
  accent: string;
  welcomeTitle: string;
  welcomeMessage: string;
  suggestedPrompts: readonly string[];
  disclaimer: string;
  poweredBy: { label: string; url: string } | null;
};

export const widgetConfig = {
  name: "Acme Support",
  description: "Fast, helpful answers from the Acme support team.",
  launcherLabel: "Chat with support",
  placeholder: "How can we help?",
  theme: "system",
  accent: "#5b5bd6",
  welcomeTitle: "How can we help?",
  welcomeMessage: "Ask a question and our support assistant will help you find the answer.",
  suggestedPrompts: [
    "How do I get started?",
    "Help me troubleshoot an issue",
    "What plans are available?",
  ],
  disclaimer: "AI can make mistakes. Check important information.",
  poweredBy: { label: "Powered by OrchaJS", url: "https://github.com/Amarsia/orcha" },
} as const satisfies WidgetConfig;
