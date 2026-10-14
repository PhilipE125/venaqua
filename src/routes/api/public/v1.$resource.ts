import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex } from "@/lib/apiHash";
import { hasApiAccess, type PlanId } from "@/lib/plans";

const json = (body: unknown, status = 200) => Response.json(body, { status });

// Venaqua Data API. Authenticated by a per-customer API key (Authorization: Bearer vq_...).
export const Route = createFileRoute("/api/public/v1/$resource")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
        if (!/^vq_[0-9a-f]{48}$/.test(key)) return json({ error: "Missing or invalid API key" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: k } = await supabaseAdmin.from("api_keys").select("id,user_id,revoked_at").eq("key_hash", await sha256Hex(key)).maybeSingle();
        if (!k || k.revoked_at) return json({ error: "Missing or invalid API key" }, 401);
        const { data: plan } = await supabaseAdmin.from("workspace_plans").select("plan").eq("user_id", k.user_id).maybeSingle();
        if (!hasApiAccess((plan?.plan as PlanId) ?? "market_access")) return json({ error: "API access requires the Data & API plan" }, 403);
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);

        switch (params.resource) {
          case "projects": {
            const { data } = await supabaseAdmin.from("reuse_projects").select("id,name,stage,owner_name,opportunity,evidence,created_at").eq("user_id", k.user_id);
            return json({ data: data ?? [] });
          }
          case "private-sites": {
            const { data } = await supabaseAdmin.from("private_sites").select("id,name,kind,lat,lon,volume_m3_day,notes,created_at").eq("user_id", k.user_id);
            return json({ data: data ?? [] });
          }
          case "plants": {
            const { fetchEea, nationalPlant } = await import("@/lib/sources/eea");
            const country = (new URL(request.url).searchParams.get("country") ?? "ES").toUpperCase();
            if (country !== "ES" && country !== "FR") return json({ error: "Supported countries: ES, FR" }, 400);
            const eea = await fetchEea(country);
            const data = [...eea.plants.values()].map(nationalPlant).filter(Boolean);
            return json({ source: "EEA UWWTD", fetchedAt: eea.fetchedAt, data });
          }
          default:
            return json({ error: "Unknown resource. Use projects, private-sites or plants." }, 404);
        }
      },
    },
  },
});
