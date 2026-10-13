import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    navigate({ to: "/explore", replace: true });
    void qc; // public map data stays cached; private project data is never cached in the query client
  };
}
