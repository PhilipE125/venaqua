import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/AuthForms";
import { safeRedirect } from "@/lib/workspace";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined }),
  head: () => ({ meta: [
    { title: "Log in · Venaqua" },
    { name: "description", content: "Log in to your Venaqua workspace." },
    { property: "og:title", content: "Log in · Venaqua" },
    { property: "og:description", content: "Open your Venaqua water-reuse workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LoginForm redirect={safeRedirect(Route.useSearch().redirect)} />,
});
