import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWorkspace } from "@/lib/workspace";

/** Client-side gate for workspace pages; private data is additionally protected by row-level security. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useWorkspace();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", search: { redirect: window.location.pathname + window.location.search }, replace: true });
  }, [ready, user, navigate]);
  if (!ready || !user) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground" role="status">Opening your workspace…</div>;
  return <>{children}</>;
}
