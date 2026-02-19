import cron from 'node-cron';
import { transactionCancelJob } from './transaction-cancel.job';

export function transactionCancelSchedule(): void {
  cron.schedule('*/5 * * * *', async () => {
    console.log(
      `⌚[CRON]: Executing transaction cancel job at ${new Date().toISOString()} 🔃`
    );

    const count = await transactionCancelJob();

    if (count > 0) {
      console.log(`⌚[CRON]: Canceled ${count} unconfirmed transaction(s) ❌`);
    }
  });
}
