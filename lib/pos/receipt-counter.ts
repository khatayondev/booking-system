import type { Prisma } from "@prisma/client";

/**
 * Generates the next sequential receipt number (e.g. "R-000123") atomically.
 * Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) on the ReceiptCounter row.
 * Because this runs inside a Prisma interactive transaction ($transaction),
 * PostgreSQL serializes concurrent sales and guarantees ZERO gaps in receipt numbers.
 * If a transaction aborts or rolls back, the counter change rolls back as well.
 */
export async function generateNextReceiptNumber(
  tx: Prisma.TransactionClient,
  prefix = "R"
): Promise<string> {
  // 1. Ensure counter row exists for this prefix
  await tx.$executeRaw`
    INSERT INTO "ReceiptCounter" ("id", "prefix", "lastNumber", "updatedAt")
    VALUES (gen_random_uuid(), ${prefix}, 0, NOW())
    ON CONFLICT ("prefix") DO NOTHING;
  `;

  // 2. Lock row with FOR UPDATE and fetch current lastNumber
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    SELECT "lastNumber"
    FROM "ReceiptCounter"
    WHERE "prefix" = ${prefix}
    FOR UPDATE;
  `;

  const currentNumber = rows[0]?.lastNumber ?? 0;
  const nextNumber = currentNumber + 1;

  // 3. Increment counter atomically
  await tx.$executeRaw`
    UPDATE "ReceiptCounter"
    SET "lastNumber" = ${nextNumber}, "updatedAt" = NOW()
    WHERE "prefix" = ${prefix};
  `;

  // 4. Format as R-000123 (6 digits)
  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
}
