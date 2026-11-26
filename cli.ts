import { checkAccounts, parseCsv, summary } from "./checker.ts";

const args = Deno.args;
if (!args.length || args.includes("--help")) {
  console.log("usage: deno run --allow-read cli.ts accounts.csv [contacts.csv]");
  Deno.exit(args.length ? 0 : 1);
}
const accounts = parseCsv(Deno.readTextFileSync(args[0]));
const contacts = args[1] ? parseCsv(Deno.readTextFileSync(args[1])) : [];
const issues = checkAccounts(accounts, contacts);
const s = summary(accounts);
console.log(`Accounts: ${accounts.length}  (1:1 ${s["1:1"]}, 1:few ${s["1:few"]}, pool ${s.pool}, unclassified ${s.other})`);
for (const i of issues) console.log(`${i.level.toUpperCase().padEnd(5)} row ${i.row} ${i.domain}: ${i.message}`);
const errors = issues.filter((i) => i.level === "error").length;
console.log(`${errors} error(s), ${issues.length - errors} warning(s)`);
Deno.exit(errors ? 1 : 0);
