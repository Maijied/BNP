import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  console.log("=== BNP Admin Seeder ===");

  const email = (process.env.ADMIN_DEFAULT_EMAIL || "bikesnumberplate@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || "ChangeThisPassword123!";

  console.log(`Seeding Admin: ${email}`);

  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || "root";
  const pass = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "bnp_shop";

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password: pass,
      database,
    });

    const hash = await bcrypt.hash(password, 10);

    await connection.execute(
      "INSERT INTO admins (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
      [email, hash]
    );

    console.log("✓ Admin account successfully seeded/updated in database.");
    await connection.end();
  } catch (err) {
    console.warn("Could not connect to MySQL server to seed admin:", err.message);
    console.log("Default env credentials will serve as fallback.");
  }
}

seedAdmin();
