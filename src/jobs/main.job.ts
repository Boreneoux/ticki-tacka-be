import { transactionExpirySchedule } from './transaction-expiry/transaction-expiry.schedule';
import { transactionCancelSchedule } from './transaction-cancel/transaction-cancel.schedule';

/**
 * Registers all cron job schedules.
 * Called once at server startup.
 */
export function mainJobs(): void {
  transactionExpirySchedule();
  transactionCancelSchedule();

  console.log('⏰ All cron job schedules registered');
}
