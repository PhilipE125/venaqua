import { createServerFn } from "@tanstack/react-start";
import type { Tender } from "../types";

// TED has no CORS, so this runs server-side (proxy).
const BODY = {
  query:
    "classification-cpv IN (45252127 45252100 45252126 90513800) AND buyer-country=ESP AND publication-date>=20240101",
  fields: [
    "publication-number",
    "publication-date",
    "notice-title",
    "buyer-name",
    "buyer-city",
    "notice-type",
    "estimated-value-proc",
    "estimated-value-cur-proc",
    "winner-name",
    "place-of-performance",
    "deadline-receipt-tender-date-lot",
  ],
  limit: 250,
  page: 1,
};

function pickLang(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return pickLang(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const val = o["spa"] ?? o["eng"] ?? Object.values(o)[0];
    return pickLang(val);
  }
  return String(v);
}

export const searchTenders = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetch("https://api.ted.europa.eu/v3/notices/search", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(BODY),
  });
  if (!r.ok) throw new Error(`TED returned HTTP ${r.status}`);
  const j = (await r.json()) as { notices?: Record<string, unknown>[] };
  const tenders: Tender[] = (j.notices ?? []).map((n) => {
    const type = String(n["notice-type"] ?? "");
    const id = String(n["publication-number"] ?? "");
    const valueRaw = Array.isArray(n["estimated-value-proc"])
      ? (n["estimated-value-proc"] as unknown[])[0]
      : n["estimated-value-proc"];
    const value = valueRaw != null ? Number(valueRaw) : null;
    return {
      id,
      date: String(n["publication-date"] ?? "").slice(0, 10),
      title: pickLang(n["notice-title"]),
      buyer: pickLang(n["buyer-name"]),
      city: pickLang(n["buyer-city"]),
      type,
      status: type.startsWith("cn") ? "open" : type.startsWith("can") ? "award" : "other",
      value: Number.isFinite(value) ? value : null,
      currency: pickLang(n["estimated-value-cur-proc"]) || null,
      winner: pickLang(n["winner-name"]) || null,
      deadline: pickLang(n["deadline-receipt-tender-date-lot"]).slice(0, 10) || null,
      url: `https://ted.europa.eu/en/notice/-/detail/${id}`,
    };
  });
  return { tenders, fetchedAt: new Date().toISOString() };
});
