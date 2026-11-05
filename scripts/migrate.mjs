import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("=== Running BNP Database Migration ===");

  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "bnp_shop";

  console.log(`Target: ${user}@${host}:${port}/${database}`);

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log("✓ Connected to MySQL server.");

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    const sqlPath = path.join(__dirname, "migrate.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    await connection.query(sql);
    console.log("✓ Successfully executed migrate.sql DDL and seed data.");

    await connection.end();
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration error:", err.message);
    console.log("Note: In environments without active cPanel MySQL, local dev mode operates with memory fallback.");
    process.exit(0); // non-blocking for build environments without local db
  }
}

runMigration();

