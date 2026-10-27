import { PgBoss } from "pg-boss";
import { notificationQueue } from "./queue";
import { logger } from "../logger";

let bossInstance: PgBoss | null = null;

export async function getPgBoss(): Promise<PgBoss | null> {
  if (process.env.NODE_ENV === "test") {
    return null; // Keep tests fast and deterministic without background pool threads
  }

  if (bossInstance) {
    return bossInstance;
  }

  const connectionString =
    process.env.DATABASE_URL || "postgresql://khatayon@localhost:5432/booking_system_db?schema=public";

  try {
    bossInstance = new PgBoss({
      connectionString,
      schema: "pgboss",
      max: 10,
    });

    bossInstance.on("error", (error: unknown) => {
      logger.error("pg-boss encountered an error", error);
    });

    await bossInstance.start();
    logger.info("pg-boss started successfully");

    interface BossJobPayload {
      id?: string;
      data?: { jobId?: string };
    }

    // Register notification worker
    await bossInstance.work("dispatch-notification", async (jobs: BossJobPayload[] | BossJobPayload) => {
      const jobList = Array.isArray(jobs) ? jobs : [jobs];
      for (const j of jobList) {
        try {
          const jobId = j.data?.jobId;
          if (jobId) {
            await notificationQueue.processJob(jobId);
          }
        } catch (err: unknown) {
          logger.error("pg-boss job processing error", err, { job: j.id });
          throw err;
        }
      }
    });

    return bossInstance;
  } catch (err: unknown) {
    logger.warn("pg-boss initialization failed or was skipped", { error: String(err) });
    return null;
  }
}

export async function stopPgBoss(): Promise<void> {
  if (bossInstance) {
    try {
      await bossInstance.stop({ graceful: true, timeout: 2000 });
    } catch (err: unknown) {
      logger.warn("Error stopping pg-boss", { error: String(err) });
    } finally {
      bossInstance = null;
    }
  }
}
