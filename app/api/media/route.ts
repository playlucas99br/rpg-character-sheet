import { authProvider } from "../../auth";
import { isSameOrigin } from "../../../lib/auth/request-origin";
import { forwardGame } from "../../../lib/game/remote";
import { mediaRequest } from "../../../lib/game/media";
export const dynamic = "force-dynamic";
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
export async function GET(request: Request) {
  if (authProvider() !== "supabase") return error("Arquivos disponíveis na versão Supabase.", 404);
  const campaignId = new URL(request.url).searchParams.get("campaignId");
  const parsed = mediaRequest.safeParse({ action: "media_list", campaignId });
  if (!parsed.success) return error("Escolha uma campanha.", 400);
  return forwardGame(request, JSON.stringify(parsed.data));
}
export async function POST(request: Request) {
  if (authProvider() !== "supabase") return error("Arquivos disponíveis na versão Supabase.", 404);
  if (!isSameOrigin(request)) return error("Origem da solicitação inválida.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return error("Envie os dados em JSON.", 415);
  if (Number(request.headers.get("content-length") || 0) > 8000) return error("Solicitação muito grande.", 413);
  try {
    const body = await request.text();
    if (body.length > 8000) return error("Solicitação muito grande.", 413);
    const parsed = mediaRequest.safeParse(JSON.parse(body));
    if (!parsed.success) return error("Confira os dados, o tipo e o tamanho do arquivo.", 400);
    return forwardGame(request, JSON.stringify(parsed.data));
  } catch { return error("Não foi possível ler a solicitação.", 400); }
}
