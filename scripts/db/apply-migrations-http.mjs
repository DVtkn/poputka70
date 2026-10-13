#!/usr/bin/env node
/**
 * Применяет локальные файлы prisma/migrations/** через Neon HTTP API.
 * Нужен там, где TCP к базе закрыт (локальные машины, CI).
 *
 *   node scripts/db/apply-migrations-http.mjs            # применить всё неприменённое
 *   node scripts/db/apply-migrations-http.mjs --check    # только показать состояние
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const CHECK_ONLY = process.argv.includes("--check");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const sql = neon(connectionString);
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

/** Делит SQL на выражения по завершающим точка-с-запятой (наши миграции — простые DDL). */
function splitStatements(sqlText) {
  const withoutComments = sqlText
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = [];
  let current = "";
  for (const line of withoutComments.split("\n")) {
    current += line + "\n";
    if (line.trimEnd().endsWith(";")) {
      const statement = current.trim().replace(/;$/, "").trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

const applied = new Set(
  (await sql.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")).map(
    (row) => row.migration_name
  )
);

const dirs = readdirSync(migrationsDir)
  .filter((name) => statSync(path.join(migrationsDir, name)).isDirectory())
  .sort();

console.log(`Применено миграций: ${applied.size}; локальных: ${dirs.length}`);

for (const dir of dirs) {
  if (applied.has(dir)) continue;
  const file = path.join(migrationsDir, dir, "migration.sql");
  const content = readFileSync(file, "utf8");
  const statements = splitStatements(content);
  const checksum = createHash("sha256").update(content).digest("hex");

  console.log(`— ${dir}: ${statements.length} выражений`);
  if (CHECK_ONLY) continue;

  try {
    // Выполняем последовательно: миграции у нас — независимые DDL-выражения,
    // а HTTP-драйвер Neon не принимает строки в transaction() без теговых вызовов.
    const IGNORABLE_CODES = new Set([
      "42701", // duplicate_column
      "42P07", // duplicate_table / duplicate_index
      "42710", // duplicate_object (например, constraint)
    ]);
    for (const statement of statements) {
      try {
        await sql.query(statement);
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        if (code && IGNORABLE_CODES.has(code)) {
          console.log(`  пропускаю (уже применено): ${statement.slice(0, 60)}…`);
          continue;
        }
        throw error;
      }
    }
    await sql.query(
      `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
       VALUES ($1, $2, $3, NOW(), NOW(), $4)`,
      [crypto.randomUUID(), checksum, dir, statements.length]
    );
    console.log(`  применена и записана в _prisma_migrations`);
  } catch (error) {
    console.error(`  ОШИБКА:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

console.log("Готово.");
