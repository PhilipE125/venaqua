import { createFileRoute } from "@tanstack/react-router";
import { MapExperience } from "@/components/MapExperience";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Free water-reuse map · Venaqua Explorer" },
      { name: "description", content: "Explore treatment plants, water recycling capacity, industrial demand and water stress across Spain and Catalonia." },
      { property: "og:title", content: "Free water-reuse map · Venaqua Explorer" },
      { property: "og:description", content: "Search plants, companies and cities and preview reuse opportunities on a free public map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MapExperience />,
});
