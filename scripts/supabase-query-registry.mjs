import { readFileSync } from "node:fs";
import ts from "typescript";

// Print a reviewed migration fragment. Never rewrite an applied migration.
const source = ts.createSourceFile("server.ts", readFileSync(new URL("../lib/game/server.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const queries = new Set();
function visit(node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "prepare") {
    if (!ts.isStringLiteral(node.arguments[0])) throw new Error("The database gateway accepts only literal queries.");
    queries.add(node.arguments[0].text);
  }
  ts.forEachChild(node, visit);
}
visit(source);
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
for (const query of [...queries].sort()) {
  const sql = query.replace(/\b(profiles|campaigns|memberships|sheets|rolls)\b/g, "nexo.$1");
  console.log(`insert into nexo.query_allowlist(query,sql_text,is_read) values (${literal(query)},${literal(sql)},${/^SELECT\b/i.test(query)}) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;`);
}
