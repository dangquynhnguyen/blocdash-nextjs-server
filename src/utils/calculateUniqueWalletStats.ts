import AppDataSource from "../db/dataSourceProd";
import { UniqueWalletsService } from "../services/UniqueWalletsHourly.service";

// Function to calculate unique wallet stats
export const calculateUniqueWalletStats = async () => {
	await AppDataSource.manager.transaction(async (manager) => {
		const service = new UniqueWalletsService();
		await service.incrementalUpdateStatsOptimized(manager);
	});
};
