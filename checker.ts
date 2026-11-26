// Checks an ABM account list (tiers, signals) and an optional buying-committee map.
export const TIERS = ["1:1", "1:few", "pool"] as const;
export const ROLES = ["champion", "economic buyer", "technical evaluator", "end user"] as const;

export type Issue = { level: "error" | "warn"; row: number; domain: string; message: string };

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function checkAccounts(accounts: Record<string, string>[], contacts: Record<string, string>[] = []): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  const rolesBy = new Map<string, Set<string>>();
  for (const c of contacts) {
    const d = (c.domain || "").toLowerCase();
    if (!rolesBy.has(d)) rolesBy.set(d, new Set());
    rolesBy.get(d)!.add((c.role || "").toLowerCase());
  }
  accounts.forEach((a, idx) => {
    const row = idx + 2;
    const domain = (a.domain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
    const add = (level: "error" | "warn", message: string) => issues.push({ level, row, domain, message });
    if (!domain) return add("error", "missing domain");
    if (seen.has(domain)) add("error", `duplicate account (first on row ${seen.get(domain)})`);
    else seen.set(domain, row);
    const tier = (a.tier || "").toLowerCase();
    if (!tier) add("error", "missing tier");
    else if (!(TIERS as readonly string[]).includes(tier)) add("error", `tier "${a.tier}" is not one of ${TIERS.join(", ")}`);
    if (tier !== "pool" && !(a.signals || "").trim()) add("warn", "no signals tracked for a 1:1 or 1:few account");
    if (tier === "1:1" && contacts.length) {
      const have = rolesBy.get(domain) ?? new Set();
      const missing = ROLES.filter((r) => !have.has(r));
      if (missing.length) add("warn", `buying committee not covered, missing: ${missing.join(", ")}`);
    }
  });
  return issues;
}

export function summary(accounts: Record<string, string>[]): Record<string, number> {
  const out: Record<string, number> = { "1:1": 0, "1:few": 0, pool: 0, other: 0 };
  for (const a of accounts) {
    const t = (a.tier || "").toLowerCase();
    out[t in out ? t : "other"]++;
  }
  return out;
}
