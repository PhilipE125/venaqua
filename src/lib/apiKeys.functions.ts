import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasApiAccess, type PlanId } from "./plans";
import { sha256Hex } from "./apiHash";

/** Creates an API key for Data API customers. The full key is returned once; only its hash is stored. */
export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("workspace_plans").select("plan").maybeSingle();
    if (!hasApiAccess((row?.plan as PlanId) ?? "market_access")) throw new Error("API access is part of the Data API plan.");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "vq_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").insert({ user_id: context.userId, name: data.name, prefix: key.slice(0, 10), key_hash: await sha256Hex(key) });
    if (error) throw new Error("Could not create the key.");
    return { key };
  });
