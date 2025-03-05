import AppDataSource from "../db/dataSourceProd";
import { AccountBalanceService } from "../services/AccountHourlyBalance.service";

export async function updateAccountBalances() {
	const service = new AccountBalanceService();

	try {
		await AppDataSource.manager.transaction(async (manager) => {
			await service.processNewTransactions(manager);
		});
	} catch (error) {
		console.error("Error updating account balances:", error);
	}
}
