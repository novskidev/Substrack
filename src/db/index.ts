import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "@/db/schema";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function ensureTables(libsqlClient: Client) {
  const tables: Array<{ name: string; create: string }> = [
    {
      name: "subscriptions",
      create: `
        CREATE TABLE IF NOT EXISTS "subscriptions" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL,
          "cost" REAL NOT NULL,
          "billing_cycle" TEXT NOT NULL,
          "next_payment_date" TEXT NOT NULL,
          "category" TEXT,
          "description" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "created_at" TEXT NOT NULL,
          "updated_at" TEXT NOT NULL
        );
      `,
    },
    {
      name: "user",
      create: `
        CREATE TABLE IF NOT EXISTS "user" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "email_verified" INTEGER NOT NULL DEFAULT 0,
          "image" TEXT,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "created_at" INTEGER NOT NULL,
          "updated_at" INTEGER NOT NULL
        );
      `,
    },
    {
      name: "session",
      create: `
        CREATE TABLE IF NOT EXISTS "session" (
          "id" TEXT PRIMARY KEY,
          "expires_at" INTEGER NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "created_at" INTEGER NOT NULL,
          "updated_at" INTEGER NOT NULL,
          "ip_address" TEXT,
          "user_agent" TEXT,
          "user_id" TEXT NOT NULL,
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
        );
      `,
    },
    {
      name: "account",
      create: `
        CREATE TABLE IF NOT EXISTS "account" (
          "id" TEXT PRIMARY KEY,
          "account_id" TEXT NOT NULL,
          "provider_id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "access_token" TEXT,
          "refresh_token" TEXT,
          "id_token" TEXT,
          "access_token_expires_at" INTEGER,
          "refresh_token_expires_at" INTEGER,
          "scope" TEXT,
          "password" TEXT,
          "created_at" INTEGER NOT NULL,
          "updated_at" INTEGER NOT NULL,
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
        );
      `,
    },
    {
      name: "verification",
      create: `
        CREATE TABLE IF NOT EXISTS "verification" (
          "id" TEXT PRIMARY KEY,
          "identifier" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expires_at" INTEGER NOT NULL,
          "created_at" INTEGER,
          "updated_at" INTEGER
        );
      `,
    },
  ];

  for (const table of tables) {
    const result = await libsqlClient.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      args: [table.name],
    });

    if (result.rows.length === 0) {
      await libsqlClient.execute(table.create);
    }
  }

  await libsqlClient.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");`,
  );
  await libsqlClient.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");`,
  );
}

await ensureTables(client).catch((error) => {
  console.error("Database initialization failed:", error);
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
