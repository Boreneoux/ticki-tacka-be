import cron from 'node-cron';
import { transactionExpiryJob } from './transaction-expiry.job';

export function transactionExpirySchedule(): void {
  cron.schedule('*/5 * * * *', async () => {
    console.log(
      `⌚[CRON]: Executing transaction expiry job at ${new Date().toISOString()} 🔃`
    );

    const count = await transactionExpiryJob();

    if (count > 0) {
      console.log(`⌚[CRON]: Expired ${count} transaction(s) 💸`);
    }
  });
}
