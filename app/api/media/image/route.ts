import { authProvider } from "../../../auth";
import { forwardGame } from "../../../../lib/game/remote";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("assetId"));
  if (authProvider() !== "supabase" || !id.success) return new Response(null, { status: 404 });
  const response = await forwardGame(request, JSON.stringify({ action: "media_read", assetId: id.data }));
  if (!response.ok) return new Response(null, { status: response.status, headers: { "Cache-Control": "private, no-store" } });
  const data = await response.json() as { url?: string };
  if (!data.url) return new Response(null, { status: 503 });
  const target = new URL(data.url), project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  if (target.origin !== project.origin || !target.pathname.startsWith("/storage/v1/object/sign/nexo-assets/")) return new Response(null, { status: 503 });
  return new Response(null, { status: 307, headers: { Location: target.href, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
