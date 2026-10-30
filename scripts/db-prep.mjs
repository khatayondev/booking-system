import { execSync } from "child_process";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // .env might not exist in environments where vars are already in system env
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️ No DATABASE_URL found. Skipping db sync.");
    return;
  }

  console.log("🔄 Syncing database schema with prisma db push...");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });
    console.log("✅ Schema synced successfully.");
  } catch (err) {
    console.error("❌ Failed to push prisma schema:", err);
    if (process.env.VERCEL) {
      process.exit(1);
    }
  }

  console.log("🌱 Checking and seeding initial studio catalogue & roles...");
  try {
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    console.log("✅ Database catalogue & roles verified.");
  } catch (err) {
    console.error("⚠️ Seeding notice:", err);
  }
}

main();
