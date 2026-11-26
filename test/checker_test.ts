import { deepStrictEqual as assertEquals } from "node:assert";
import { checkAccounts, parseCsv, summary } from "../checker.ts";

Deno.test("parses quoted csv", () => {
  const r = parseCsv('domain,tier,signals\nacme.example,1:1,"hiring|funding"\n');
  assertEquals(r[0].signals, "hiring|funding");
});

Deno.test("flags bad tier, missing tier, duplicates", () => {
  const rows = parseCsv("domain,tier,signals\na.example,gold,x\nb.example,,x\nwww.a.example,pool,\n");
  const msgs = checkAccounts(rows).map((i) => i.message);
  assertEquals(msgs.some((m) => m.includes("not one of")), true);
  assertEquals(msgs.some((m) => m === "missing tier"), true);
  assertEquals(msgs.some((m) => m.startsWith("duplicate account")), true);
});

Deno.test("1:1 account needs the whole committee", () => {
  const acc = parseCsv("domain,tier,signals\na.example,1:1,hiring\n");
  const con = parseCsv("domain,name,role\na.example,P,champion\na.example,Q,economic buyer\n");
  const issue = checkAccounts(acc, con).find((i) => i.message.includes("committee"));
  assertEquals(issue?.message.includes("technical evaluator, end user"), true);
});

Deno.test("warns on 1:few without signals, not pool", () => {
  const rows = parseCsv("domain,tier,signals\na.example,1:few,\nb.example,pool,\n");
  assertEquals(checkAccounts(rows).length, 1);
});

Deno.test("summary counts tiers", () => {
  assertEquals(summary(parseCsv("domain,tier\na,1:1\nb,pool\nc,zzz\n")), { "1:1": 1, "1:few": 0, pool: 1, other: 1 });
});
