import { SupportWidget } from "@/components/support-widget";
import { widgetConfig } from "@/config/widget";

export const dynamic = "force-dynamic";

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
    <div className="h-dvh min-h-[480px] w-full min-w-[340px]">
      <SupportWidget config={widgetConfig} parentOrigin={parentOrigin(query.parentOrigin)} />
    </div>
  );
}
