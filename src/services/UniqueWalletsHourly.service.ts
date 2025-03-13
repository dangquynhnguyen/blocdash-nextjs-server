import { EntityManager } from "typeorm";
import { UniqueWalletsHourly } from "../entities/UniqueWalletsHourly";
import { WalletCategory } from "../enums/wallet.enum";

export class UniqueWalletsService {
	public async calculateAllHourlyStats(manager: EntityManager) {
		console.log(
			`[UniqueWalletsService] Starting calculation for all hours continuously`
		);
		console.time("Total calculation time");

		// Find the earliest and latest hour in account_hourly_balance
		console.time("Finding date range");
		const [earliest] = await manager.query(`
            SELECT MIN(hour) as min_hour FROM account_hourly_balance
        `);

		const [latest] = await manager.query(`
            SELECT MAX(hour) as max_hour FROM account_hourly_balance
        `);
		console.timeEnd("Finding date range");

		if (!earliest.min_hour || !latest.max_hour) {
			console.log(
				`[UniqueWalletsService] No records found in account_hourly_balance`
			);
			return;
		}

		const startHour = new Date(earliest.min_hour);
		startHour.setMinutes(0, 0, 0); // Ensure we start at the beginning of an hour

		const endHour = new Date(latest.max_hour);
		endHour.setMinutes(0, 0, 0); // Ensure we end at the beginning of an hour

		console.log(
			`[UniqueWalletsService] Processing hours from ${startHour.toISOString()} to ${endHour.toISOString()}`
		);

		// Find all hours that already have stats
		console.time("Fetching existing hours");
		const existingHoursResult = await manager.query(`
            SELECT hour FROM unique_wallets_hourly ORDER BY hour
        `);
		const existingHourSet = new Set(
			existingHoursResult.map((record: any) => {
				const date = new Date(record.hour);
				date.setMinutes(0, 0, 0);
				return date.toISOString();
			})
		);
		console.timeEnd("Fetching existing hours");
		console.log(
			`[UniqueWalletsService] Found ${existingHourSet.size} existing hours with stats`
		);

		// Find all hours that have data in account_hourly_balance
		console.time("Fetching hours with data");
		const hoursWithDataResult = await manager.query(`
            SELECT DISTINCT hour FROM account_hourly_balance ORDER BY hour
        `);
		const hoursWithDataSet = new Set(
			hoursWithDataResult.map((record: any) => {
				const date = new Date(record.hour);
				date.setMinutes(0, 0, 0);
				return date.toISOString();
			})
		);
		console.timeEnd("Fetching hours with data");
		console.log(
			`[UniqueWalletsService] Found ${hoursWithDataSet.size} hours with data`
		);

		// Track all unique wallet addresses we've seen
		const allWallets = new Map<string, WalletCategory>(); // account_identifier -> latest category

		// Preload all existing wallet data if resuming calculation
		let lastProcessedHour: Date | null = null;
		if (existingHourSet.size > 0) {
			console.log(`[UniqueWalletsService] Preloading existing wallet data...`);
			console.time("Preloading wallets");

			// Find the last hour we processed
			const [lastHour] = await manager.query(`
                SELECT hour FROM unique_wallets_hourly 
                ORDER BY hour DESC LIMIT 1
            `);

			if (lastHour) {
				lastProcessedHour = new Date(lastHour.hour);

				// Get all unique wallets up to that hour
				const allWalletsResult = await manager.query(
					`
                    SELECT DISTINCT account_identifier, wallet_category
                    FROM account_hourly_balance
                    WHERE hour <= $1
                    ORDER BY account_identifier
                `,
					[lastProcessedHour]
				);

				// Add to our tracking map
				allWalletsResult.forEach(
					(wallet: {
						account_identifier: string;
						wallet_category: WalletCategory;
					}) => {
						allWallets.set(wallet.account_identifier, wallet.wallet_category);
					}
				);

				console.log(
					`[UniqueWalletsService] Preloaded ${allWallets.size} unique wallets up to ${lastProcessedHour.toISOString()}`
				);
			}

			console.timeEnd("Preloading wallets");
		}

		// Process all hours in sequence
		const currentHour = lastProcessedHour
			? new Date(lastProcessedHour.getTime() + 3600000) // start from next hour
			: new Date(startHour);

		let processedCount = 0;
		let skippedCount = 0;
		let copiedCount = 0;
		let calculatedCount = 0;
		let lastStats: UniqueWalletsHourly | null = null;
		let batchSize = 0;
		let batchStart = new Date();

		while (currentHour <= endHour) {
			// Track batch timing
			if (batchSize === 0) {
				batchStart = new Date();
				console.log(
					`[UniqueWalletsService] Starting new batch at ${batchStart.toISOString()}`
				);
			}

			// Format hour for consistent comparison
			const hourKey = currentHour.toISOString();

			// Skip hours that already have stats
			if (existingHourSet.has(hourKey)) {
				// We should still get the last stats for future copying
				lastStats = await manager.findOne(UniqueWalletsHourly, {
					where: { hour: currentHour },
				});
				skippedCount++;

				// Move to next hour
				currentHour.setHours(currentHour.getHours() + 1);

				if (skippedCount % 100 === 0) {
					console.log(
						`[UniqueWalletsService] Skipped ${skippedCount} hours so far`
					);
				}

				continue;
			}

			// Process this hour in a separate transaction
			await manager.connection.transaction(async (transactionManager) => {
				try {
					// Check if this hour has data in account_hourly_balance
					if (hoursWithDataSet.has(hourKey)) {
						// Process this hour - calculate new stats
						console.log(
							`[UniqueWalletsService] Calculating stats for hour: ${hourKey}`
						);
						console.time(`Calculate ${hourKey}`);

						// Get all wallets active in this hour
						const newWallets = await transactionManager.query(`
                            SELECT DISTINCT 
                                account_identifier, 
                                wallet_category
                            FROM 
                                account_hourly_balance
                            WHERE 
                                hour = '${hourKey}'
                        `);

						// Add any new wallets to our tracking map
						newWallets.forEach(
							(wallet: {
								account_identifier: string;
								wallet_category: WalletCategory;
							}) => {
								allWallets.set(
									wallet.account_identifier,
									wallet.wallet_category
								);
							}
						);

						// Create a map to count wallets by category
						const walletsByCategory = new Map<WalletCategory, number>();
						Object.values(WalletCategory).forEach((category) => {
							walletsByCategory.set(category, 0);
						});

						// Count wallets by category
						for (const category of allWallets.values()) {
							const currentCount = walletsByCategory.get(category) || 0;
							walletsByCategory.set(category, currentCount + 1);
						}

						// Create new record
						const hourlyStats = new UniqueWalletsHourly();
						hourlyStats.hour = new Date(currentHour);
						hourlyStats.total_wallets = allWallets.size;

						// Set counts by category
						hourlyStats.plankton_count =
							walletsByCategory.get(WalletCategory.PLANKTON) || 0;
						hourlyStats.shrimp_count =
							walletsByCategory.get(WalletCategory.SHRIMP) || 0;
						hourlyStats.crab_count =
							walletsByCategory.get(WalletCategory.CRAB) || 0;
						hourlyStats.octopus_count =
							walletsByCategory.get(WalletCategory.OCTOPUS) || 0;
						hourlyStats.fish_count =
							walletsByCategory.get(WalletCategory.FISH) || 0;
						hourlyStats.dolphin_count =
							walletsByCategory.get(WalletCategory.DOLPHIN) || 0;
						hourlyStats.shark_count =
							walletsByCategory.get(WalletCategory.SHARK) || 0;
						hourlyStats.whale_count =
							walletsByCategory.get(WalletCategory.WHALE) || 0;
						hourlyStats.humpback_count =
							walletsByCategory.get(WalletCategory.HUMPBACK) || 0;

						// Save to database - this will commit at the end of this transaction
						await transactionManager.save(hourlyStats);
						lastStats = hourlyStats;
						calculatedCount++;

						console.log(
							`[UniqueWalletsService] Calculated stats for hour ${hourKey}: ${hourlyStats.total_wallets} total unique wallets (${newWallets.length} new in this hour)`
						);
						console.timeEnd(`Calculate ${hourKey}`);

						// Verify record was saved
						const verification = await transactionManager.query(`
                            SELECT COUNT(*) FROM unique_wallets_hourly WHERE hour = '${hourKey}'
                        `);
						console.log(
							`[UniqueWalletsService] Verified ${verification[0].count} records saved for hour ${hourKey}`
						);
					} else {
						// No data for this hour - copy from previous hour if available
						console.log(
							`[UniqueWalletsService] No data for hour ${hourKey}, copying from previous hour`
						);

						if (!lastStats) {
							console.log(
								`[UniqueWalletsService] No previous stats to copy from, creating empty record`
							);

							// Create empty record with current cumulative counts
							const emptyStats = new UniqueWalletsHourly();
							emptyStats.hour = new Date(currentHour);
							emptyStats.total_wallets = allWallets.size;

							// Count wallets by category
							const walletsByCategory = new Map<WalletCategory, number>();
							Object.values(WalletCategory).forEach((category) => {
								walletsByCategory.set(category, 0);
							});

							for (const category of allWallets.values()) {
								const currentCount = walletsByCategory.get(category) || 0;
								walletsByCategory.set(category, currentCount + 1);
							}

							// Set counts by category
							emptyStats.plankton_count =
								walletsByCategory.get(WalletCategory.PLANKTON) || 0;
							emptyStats.shrimp_count =
								walletsByCategory.get(WalletCategory.SHRIMP) || 0;
							emptyStats.crab_count =
								walletsByCategory.get(WalletCategory.CRAB) || 0;
							emptyStats.octopus_count =
								walletsByCategory.get(WalletCategory.OCTOPUS) || 0;
							emptyStats.fish_count =
								walletsByCategory.get(WalletCategory.FISH) || 0;
							emptyStats.dolphin_count =
								walletsByCategory.get(WalletCategory.DOLPHIN) || 0;
							emptyStats.shark_count =
								walletsByCategory.get(WalletCategory.SHARK) || 0;
							emptyStats.whale_count =
								walletsByCategory.get(WalletCategory.WHALE) || 0;
							emptyStats.humpback_count =
								walletsByCategory.get(WalletCategory.HUMPBACK) || 0;

							await transactionManager.save(emptyStats);
							lastStats = emptyStats;
						} else {
							// Copy from previous hour - the counts should be identical since no new wallets appeared
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
							lastStats = copiedStats;
						}

						copiedCount++;
						console.log(
							`[UniqueWalletsService] Copied stats for hour ${hourKey}: ${lastStats.total_wallets} total unique wallets`
						);
					}
				} catch (error) {
					console.error(
						`[UniqueWalletsService] Error processing hour ${hourKey}:`,
						error
					);
					throw error; // Re-throw to ensure transaction rolls back
				}
			});

			processedCount++;

			// Batch reporting
			batchSize++;
			if (batchSize >= 24) {
				// Report every 24 hours (1 day)
				const batchEnd = new Date();
				const batchTimeMs = batchEnd.getTime() - batchStart.getTime();
				console.log(
					`[UniqueWalletsService] Processed batch of ${batchSize} hours in ${batchTimeMs}ms (${
						batchTimeMs / batchSize
					}ms per hour)`
				);
				console.log(
					`[UniqueWalletsService] Progress: Processed ${processedCount}, Calculated ${calculatedCount}, Copied ${copiedCount}, Skipped ${skippedCount}`
				);
				console.log(
					`[UniqueWalletsService] Current total unique wallets: ${allWallets.size}`
				);
				batchSize = 0;
			}

			// Move to next hour
			currentHour.setHours(currentHour.getHours() + 1);
		}

		console.timeEnd("Total calculation time");
		console.log(`[UniqueWalletsService] Completed calculation for all hours`);
		console.log(
			`[UniqueWalletsService] Final total unique wallets: ${allWallets.size}`
		);
		console.log(
			`[UniqueWalletsService] Total hours processed: ${processedCount}`
		);
		console.log(
			`[UniqueWalletsService] Hours with calculated stats: ${calculatedCount}`
		);
		console.log(
			`[UniqueWalletsService] Hours with copied stats: ${copiedCount}`
		);
		console.log(
			`[UniqueWalletsService] Hours skipped (already existed): ${skippedCount}`
		);
		console.log(
			`[UniqueWalletsService] Total hours in range: ${processedCount + skippedCount}`
		);
	}

	// Keep the calculateHourlyStats method for cron jobs
}
