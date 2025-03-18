import { EntityManager } from "typeorm";
import { UniqueWalletsHourly } from "../entities/UniqueWalletsHourly";
import { WalletCategory } from "../enums/wallet.enum";

export class UniqueWalletsService {
	public async incrementalUpdateStatsOptimized(
		manager: EntityManager,
		maxHoursToProcess: number = 10 // Giảm số giờ mỗi lần chạy để giảm tải
	) {
		console.log(`[UniqueWalletsService] Starting optimized incremental update`);
		console.time("Incremental update time");

		// 1. Find the latest hour in unique_wallets_hourly
		const [lastStatHour] = await manager.query(`
        SELECT hour FROM unique_wallets_hourly 
        ORDER BY hour DESC LIMIT 1
    `);

		if (!lastStatHour) {
			console.log(
				`[UniqueWalletsService] No existing stats found. Run the full calculation first.`
			);
			return;
		}

		const lastProcessedHour = new Date(lastStatHour.hour);
		console.log(
			`[UniqueWalletsService] Last processed hour: ${lastProcessedHour.toISOString()}`
		);

		// 2. Find the latest hour in account_hourly_balance
		const [latestData] = await manager.query(`
        SELECT MAX(hour) as max_hour FROM account_hourly_balance
    `);

		if (!latestData.max_hour) {
			console.log(`[UniqueWalletsService] No new data to process.`);
			return;
		}

		const latestDataHour = new Date(latestData.max_hour);
		latestDataHour.setMinutes(0, 0, 0); // Ensure hour alignment

		// 3. Delete the latest record as it might be incomplete
		console.log(
			`[UniqueWalletsService] Deleting latest stats record to recalculate`
		);
		await manager.query(`
        DELETE FROM unique_wallets_hourly WHERE hour = '${lastProcessedHour.toISOString()}'
    `);

		// 4. Setup processing range with smaller batch
		const startHour = new Date(lastProcessedHour);
		let currentHour = new Date(startHour);

		// Limit processing to fewer hours
		const maxEndHour = new Date(startHour);
		maxEndHour.setHours(maxEndHour.getHours() + maxHoursToProcess);
		const endHour = maxEndHour < latestDataHour ? maxEndHour : latestDataHour;

		console.log(
			`[UniqueWalletsService] Processing from ${startHour.toISOString()} to ${endHour.toISOString()}`
		);
		console.log(
			`[UniqueWalletsService] Will process up to ${maxHoursToProcess} hours in this run`
		);

		// 5. Get latest existing stats to use for copying
		let lastStats: UniqueWalletsHourly | null = null;
		if (startHour.getTime() > new Date(0).getTime()) {
			const previousHour = new Date(startHour);
			previousHour.setHours(previousHour.getHours() - 1);
			lastStats = await manager.findOne(UniqueWalletsHourly, {
				where: { hour: previousHour },
			});
		}

		// 6. Process each hour with more memory-efficient approach
		let processedCount = 0;

		while (currentHour <= endHour && processedCount < maxHoursToProcess) {
			const hourKey = currentHour.toISOString();
			console.log(`[UniqueWalletsService] Processing hour: ${hourKey}`);

			// Process one hour at a time to manage memory better
			try {
				// Wait briefly between hours to reduce CPU load
				await new Promise((resolve) => setTimeout(resolve, 500));

				// Process the hour
				const hourStats = await this.processHourOptimized(
					manager,
					currentHour,
					lastStats
				);
				lastStats = hourStats;
				processedCount++;
			} catch (error) {
				console.error(
					`[UniqueWalletsService] Error processing hour ${hourKey}:`,
					error
				);
				break; // Stop on first error
			}

			// Move to next hour
			currentHour.setHours(currentHour.getHours() + 1);

			// Force memory cleanup explicitly
			global.gc && global.gc();
		}

		console.timeEnd("Incremental update time");
		console.log(`[UniqueWalletsService] Processed ${processedCount} hours`);
		console.log(
			`[UniqueWalletsService] Next run will start at: ${currentHour.toISOString()}`
		);

		return processedCount;
	}

	/**
	 * Process a single hour with optimized queries
	 * This is a helper method that separates processing logic to improve memory management
	 */
	private async processHourOptimized(
		manager: EntityManager,
		currentHour: Date,
		lastStats: UniqueWalletsHourly | null
	): Promise<UniqueWalletsHourly | null> {
		const hourKey = currentHour.toISOString();

		// Use a transaction with a smaller scope
		return await manager.transaction(async (transactionManager) => {
			try {
				// Check if this hour has any data using index-friendly query
				const [hasData] = await transactionManager.query(`
                SELECT EXISTS (
                    SELECT 1 FROM account_hourly_balance 
                    WHERE hour = '${hourKey}'
                    LIMIT 1
                ) as has_data
            `);

				if (hasData.has_data) {
					// Use optimized query that is more efficient for our indexes
					const categoryCounts = await transactionManager.query(`
                    WITH RankedWallets AS (
                        SELECT DISTINCT ON (account_identifier) 
                            account_identifier, 
                            wallet_category
                        FROM 
                            account_hourly_balance
                        WHERE 
                            hour <= '${hourKey}'
                        ORDER BY 
                            account_identifier, hour DESC
                    )
                    SELECT 
                        wallet_category,
                        COUNT(*) as count
                    FROM 
                        RankedWallets
                    GROUP BY 
                        wallet_category
                `);

					// Use the total from categoryCounts sum instead of separate query
					const totalWallets = categoryCounts.reduce(
						(sum: number, item: any) => sum + parseInt(item.count),
						0
					);

					// Create new stats record
					const hourlyStats = new UniqueWalletsHourly();
					hourlyStats.hour = new Date(currentHour);
					hourlyStats.total_wallets = totalWallets;

					// Initialize all counts to 0
					hourlyStats.plankton_count = 0;
					hourlyStats.shrimp_count = 0;
					hourlyStats.crab_count = 0;
					hourlyStats.octopus_count = 0;
					hourlyStats.fish_count = 0;
					hourlyStats.dolphin_count = 0;
					hourlyStats.shark_count = 0;
					hourlyStats.whale_count = 0;
					hourlyStats.humpback_count = 0;

					// Update counts from query result
					categoryCounts.forEach(
						(result: { wallet_category: WalletCategory; count: string }) => {
							const count = parseInt(result.count);
							switch (result.wallet_category) {
								case WalletCategory.PLANKTON:
									hourlyStats.plankton_count = count;
									break;
								case WalletCategory.SHRIMP:
									hourlyStats.shrimp_count = count;
									break;
								case WalletCategory.CRAB:
									hourlyStats.crab_count = count;
									break;
								case WalletCategory.OCTOPUS:
									hourlyStats.octopus_count = count;
									break;
								case WalletCategory.FISH:
									hourlyStats.fish_count = count;
									break;
								case WalletCategory.DOLPHIN:
									hourlyStats.dolphin_count = count;
									break;
								case WalletCategory.SHARK:
									hourlyStats.shark_count = count;
									break;
								case WalletCategory.WHALE:
									hourlyStats.whale_count = count;
									break;
								case WalletCategory.HUMPBACK:
									hourlyStats.humpback_count = count;
									break;
							}
						}
					);

					await transactionManager.save(hourlyStats);
					console.log(
						`[UniqueWalletsService] Calculated stats for hour ${hourKey}: ${hourlyStats.total_wallets} total unique wallets`
					);

					return hourlyStats;
				} else if (lastStats) {
					// Copy from previous hour if no data
					const copiedStats = new UniqueWalletsHourly();
					copiedStats.hour = new Date(currentHour);
					copiedStats.total_wallets = lastStats.total_wallets;
					copiedStats.plankton_count = lastStats.plankton_count;
					copiedStats.shrimp_count = lastStats.shrimp_count;
					copiedStats.crab_count = lastStats.crab_count;
					copiedStats.octopus_count = lastStats.octopus_count;
					copiedStats.fish_count = lastStats.fish_count;
					copiedStats.dolphin_count = lastStats.dolphin_count;
					copiedStats.shark_count = lastStats.shark_count;
					copiedStats.whale_count = lastStats.whale_count;
					copiedStats.humpback_count = lastStats.humpback_count;

					await transactionManager.save(copiedStats);
					console.log(
						`[UniqueWalletsService] Copied stats for hour ${hourKey}`
					);

					return copiedStats;
				}

				return null;
			} catch (error) {
				console.error(
					`[UniqueWalletsService] Error in processHourOptimized for ${hourKey}:`,
					error
				);
				throw error;
			}
		});
	}
}
