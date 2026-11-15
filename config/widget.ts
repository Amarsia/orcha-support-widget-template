export type WidgetTheme = "light" | "dark" | "system";

export type WidgetConfig = {
  /** Display name shown in the browser tab, widget header, welcome screen, and embed iframe title. */
  name: string;
  /** Short subtitle shown on the welcome screen and landing sidebar. */
  description: string;
  /** Path under `public/` (or absolute URL) used for the favicon, widget header, welcome card, assistant avatar, and floating launcher button. */
  icon: string;
  /** Accessible label for the floating launcher button. */
  launcherLabel: string;
  /** Input placeholder text. */
  placeholder: string;
  /** Default color theme. */
  theme: WidgetTheme;
  /** Primary brand accent color (6-digit hex). */
  accent: string;
  /** Quick-start options shown on the welcome screen. */
  suggestedPrompts: readonly string[];
  /** Optional footer disclaimer text. */
  disclaimer: string;
  /** Attribution link in the widget footer, or `null` to hide. */
  poweredBy: { label: string; url: string } | null;
  /** Allow visitors to attach files to messages. */
  allowFileUploads: boolean;
  /** Maximum size per uploaded file in MB. */
  maxFileSizeMb: number;
};

export const widgetConfig = {
  name: "Acme Support",
  description: "Fast, helpful answers from the Acme support team.",
  icon: "/widget-mark.svg",
  launcherLabel: "Chat with support",
  placeholder: "How can we help?",
  theme: "system",
  accent: "#5b5bd6",
  suggestedPrompts: [
    "How do I get started?",
    "Help me troubleshoot an issue",
    "What plans are available?",
  ],
  disclaimer: "AI can make mistakes. Check important information.",
  poweredBy: { label: "Powered by OrchaJS", url: "https://github.com/Amarsia/orcha" },
  allowFileUploads: true,
  maxFileSizeMb: 10,
} as const satisfies WidgetConfig;
