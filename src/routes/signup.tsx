import { createFileRoute } from "@tanstack/react-router";
import { SignupForm } from "@/components/AuthForms";
import { safeRedirect } from "@/lib/workspace";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined }),
  head: () => ({ meta: [
    { title: "Create a free workspace · Venaqua" },
    { name: "description", content: "Create a free Venaqua workspace to save water-reuse opportunities and build your project pipeline." },
    { property: "og:title", content: "Create a free workspace · Venaqua" },
    { property: "og:description", content: "Start free — no payment details needed." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SignupForm redirect={safeRedirect(Route.useSearch().redirect)} />,
});
