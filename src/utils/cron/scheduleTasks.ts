import cron from "node-cron";
import { fetchAndStoreTransactions } from "../api/fetchAndStoreTransactions";
import { calculateUniqueWalletStats } from "../db/uniqueWallets";
import { updateAccountBalances } from "../db/updateAccountBalance";

export function setupCronJobs(): void {
	// Fetch and store transactions every minute at 30s
	cron.schedule("30 * * * * *", fetchAndStoreTransactions);

	// Update account balances every minute
	cron.schedule("* * * * *", updateAccountBalances);

	// Calculate unique wallet stats every minute at 30 minutes
	cron.schedule("20 */30 * * * *", calculateUniqueWalletStats);

	console.log("Cron jobs scheduled successfully");
}
