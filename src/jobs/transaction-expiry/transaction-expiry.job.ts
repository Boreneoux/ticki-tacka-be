import { prisma } from '../../config/prisma-client.config';
import { PrismaClient } from '../../generated/prisma/client';
import { transactionService } from '../../services/transactions.service';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

/**
 * Expires transactions that are still `waiting_for_payment`
 * after their `paymentDeadline` has passed.
 *
 * For each expired transaction:
 * - Rolls back soldCount, points, coupons, and vouchers
 * - Sets status to `expired`
 */
export async function transactionExpiryJob(): Promise<number> {
  const expiredTransactions = await prisma.transaction.findMany({
    where: {
      paymentStatus: 'waiting_for_payment',
      paymentDeadline: { lt: new Date() },
      deletedAt: null
    }
  });

  let expiredCount = 0;

  for (const trx of expiredTransactions) {
    try {
      await prisma.$transaction(async (tx: TransactionClient) => {
        await transactionService._rollbackTransactionData(tx, trx.id);

        await tx.transaction.update({
          where: { id: trx.id },
          data: { paymentStatus: 'expired' }
        });
      });

      expiredCount++;
    } catch (error) {
      console.error(`[CRON] Failed to expire transaction ${trx.id}:`, error);
    }
  }

  return expiredCount;
}
