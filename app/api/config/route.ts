import { widgetConfig } from "@/config/widget";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(widgetConfig, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
