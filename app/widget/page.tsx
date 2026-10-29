import { SupportWidget } from "@/components/support-widget";
import { widgetConfig, type WidgetTheme } from "@/config/widget";

export const dynamic = "force-dynamic";

function theme(value: string | string[] | undefined): WidgetTheme {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "light" || selected === "dark" || selected === "system"
    ? selected
    : widgetConfig.theme;
}

function parentOrigin(value: string | string[] | undefined): string | undefined {
  const selected = Array.isArray(value) ? value[0] : value;
  if (!selected) return;
  try {
    const url = new URL(selected);
    return url.protocol === "https:" || (url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))
      ? url.origin
      : undefined;
  } catch {
    return;
  }
}

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <SupportWidget
      config={widgetConfig}
      initialTheme={theme(query.theme)}
      parentOrigin={parentOrigin(query.parentOrigin)}
    />
  );
}
