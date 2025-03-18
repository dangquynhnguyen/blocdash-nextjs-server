import cron from "node-cron";
import { fetchAndStoreTransactions } from "../api/fetchAndStoreTransactions";
import { calculateUniqueWalletStats } from "../db/uniqueWallets";
import { updateAccountBalances } from "../db/updateAccountBalance";

export function setupCronJobs(): void {
	// Fetch and store transactions every minute at 40s
	cron.schedule("40 * * * * *", fetchAndStoreTransactions);

	// Update account balances every minute
	cron.schedule("* * * * *", updateAccountBalances);

	// Calculate unique wallet stats every minute at 20s
	cron.schedule("20 * * * * *", calculateUniqueWalletStats);

	console.log("Cron jobs scheduled successfully");
}
