// Summary of the user's landscape research for Catalonia (36 players). Entries came from
// general knowledge in the research and are marked there as needing verification.
export const LANDSCAPE = {
  note: "From our landscape research (36 players in Catalonia, Spain, EU and global). Entries need verifying.",
  total: 36,
  questions: [
    { who: "1 · Plant operator: who would buy my water?", players: 13 },
    { who: "2 · Factory: is recycled water cheaper?", players: 8 },
    { who: "3 · Factory on site: build or connect?", players: 8 },
    { who: "4 · City or region: which links help most?", players: 9 },
    { who: "5 · Factory: future exposure", players: 6 },
  ],
  capabilities: [
    { name: "Connection map", players: 7, ours: "yes" },
    { name: "Connection cost", players: 8, ours: "yes" },
    { name: "Build vs connect", players: 8, ours: "yes" },
    { name: "Stress projections", players: 9, ours: "yes" },
    { name: "Shared clusters", players: 5, ours: "yes" },
  ],
  gaps: [
    "MITECO publishes no national reuse register.",
    "No register publishes water use per industrial site; every demand figure is an estimate.",
    "The EEA reuse field is sparse and inconsistent across countries.",
    "On-site vs grid needs site water use, effluent quality and treatment costs; none is public per site.",
    "No public source projects water tariffs per site; future tariffs are scenarios.",
  ],
};
