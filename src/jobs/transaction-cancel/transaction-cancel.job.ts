import { prisma } from '../../config/prisma-client.config';
import { PrismaClient } from '../../generated/prisma/client';
import { transactionService } from '../../services/transactions.service';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

/**
 * Cancels transactions that are still `waiting_for_admin_confirmation`
 * after their `confirmationDeadline` has passed (3 days after proof upload).
 *
 * For each unconfirmed transaction:
 * - Rolls back soldCount, points, coupons, and vouchers
 * - Sets status to `canceled`
 */
export async function transactionCancelJob(): Promise<number> {
  const unconfirmedTransactions = await prisma.transaction.findMany({
    where: {
      paymentStatus: 'waiting_for_admin_confirmation',
      confirmationDeadline: { lt: new Date() },
      deletedAt: null
    }
  });

  let canceledCount = 0;

  for (const trx of unconfirmedTransactions) {
    try {
      await prisma.$transaction(async (tx: TransactionClient) => {
        await transactionService._rollbackTransactionData(tx, trx.id);

        await tx.transaction.update({
          where: { id: trx.id },
          data: { paymentStatus: 'canceled' }
        });
      });

      canceledCount++;
    } catch (error) {
      console.error(
        `[CRON] Failed to cancel unconfirmed transaction ${trx.id}:`,
        error
      );
    }
  }

  return canceledCount;
}
