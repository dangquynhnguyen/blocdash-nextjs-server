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

		// Find the last hour we processed
		let lastProcessedHour: Date | null = null;
		if (existingHourSet.size > 0) {
			console.log(`[UniqueWalletsService] Finding latest hour with stats...`);
			const [lastHour] = await manager.query(`
                SELECT hour FROM unique_wallets_hourly 
                ORDER BY hour DESC LIMIT 1
            `);

			if (lastHour) {
				lastProcessedHour = new Date(lastHour.hour);
				console.log(
					`[UniqueWalletsService] Latest hour with stats: ${lastProcessedHour.toISOString()}`
				);

				// Remove this hour from the set of hours to skip
				// so we update this hour with fresh data
				const lastHourKey = lastProcessedHour.toISOString();
				existingHourSet.delete(lastHourKey);

				// Delete the latest record so we can replace it
				console.log(
					`[UniqueWalletsService] Deleting latest record to recalculate it`
				);
				await manager.query(`
                    DELETE FROM unique_wallets_hourly WHERE hour = '${lastHourKey}'
                `);
			}
		}

		// Process all hours in sequence
		const currentHour = lastProcessedHour
			? new Date(lastProcessedHour.getTime()) // Start FROM the latest hour
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

			// Skip hours that already have stats (except the latest hour which we deliberately removed)
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

						// Get most recent category for ALL wallets up to this hour
						// using a WITH query with ROW_NUMBER to get the most recent category for each wallet
						const mostRecentCategoriesResult = await transactionManager.query(`
                            WITH RankedWallets AS (
                                SELECT 
                                    account_identifier, 
                                    wallet_category,
                                    ROW_NUMBER() OVER(PARTITION BY account_identifier ORDER BY hour DESC) as rn
                                FROM 
                                    account_hourly_balance
                                WHERE 
                                    hour <= '${hourKey}'
                            )
                            SELECT 
                                account_identifier, 
                                wallet_category
                            FROM 
                                RankedWallets
                            WHERE 
                                rn = 1
                        `);

						// Create a map to track most recent category for each wallet
						const walletMostRecentCategory = new Map<string, WalletCategory>();

						// Update our tracking map with the most recent category for each wallet
						mostRecentCategoriesResult.forEach(
							(result: {
								account_identifier: string;
								wallet_category: WalletCategory;
							}) => {
								walletMostRecentCategory.set(
									result.account_identifier,
									result.wallet_category
								);
							}
						);

						// Initialize category map with zeros
						const walletsByCategory = new Map<WalletCategory, number>();
						Object.values(WalletCategory).forEach((category) => {
							walletsByCategory.set(category, 0);
						});

						// Count wallets by their most recent category
						for (const [_, category] of walletMostRecentCategory.entries()) {
							const currentCount = walletsByCategory.get(category) || 0;
							walletsByCategory.set(category, currentCount + 1);
						}

						// Create new record with all data
						const hourlyStats = new UniqueWalletsHourly();
						hourlyStats.hour = new Date(currentHour);
						hourlyStats.total_wallets = walletMostRecentCategory.size;

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

						// Verify total matches the sum of categories
						const totalFromCategories = Array.from(
							walletsByCategory.values()
						).reduce((sum, count) => sum + count, 0);

						console.log(
							`[UniqueWalletsService] Sum of categories: ${totalFromCategories}, Total unique wallets: ${hourlyStats.total_wallets}`
						);

						// Save to database - this will commit at the end of this transaction
						await transactionManager.save(hourlyStats);
						lastStats = hourlyStats;
						calculatedCount++;

						console.log(
							`[UniqueWalletsService] Calculated stats for hour ${hourKey}: ${hourlyStats.total_wallets} total unique wallets`
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

							// Get most recent category for ALL wallets up to this hour
							const mostRecentCategoriesResult =
								await transactionManager.query(`
                                WITH RankedWallets AS (
                                    SELECT 
                                        account_identifier, 
                                        wallet_category,
                                        ROW_NUMBER() OVER(PARTITION BY account_identifier ORDER BY hour DESC) as rn
                                    FROM 
                                        account_hourly_balance
                                    WHERE 
                                        hour < '${hourKey}'
                                )
                                SELECT 
                                    account_identifier, 
                                    wallet_category
                                FROM 
                                    RankedWallets
                                WHERE 
                                    rn = 1
                            `);

							// Create a map to track most recent category for each wallet
							const walletMostRecentCategory = new Map<
								string,
								WalletCategory
							>();

							// Update our tracking map with the most recent category for each wallet
							mostRecentCategoriesResult.forEach(
								(result: {
									account_identifier: string;
									wallet_category: WalletCategory;
								}) => {
									walletMostRecentCategory.set(
										result.account_identifier,
										result.wallet_category
									);
								}
							);

							// Initialize category map with zeros
							const walletsByCategory = new Map<WalletCategory, number>();
							Object.values(WalletCategory).forEach((category) => {
								walletsByCategory.set(category, 0);
							});

							// Count wallets by their most recent category
							for (const [_, category] of walletMostRecentCategory.entries()) {
								const currentCount = walletsByCategory.get(category) || 0;
								walletsByCategory.set(category, currentCount + 1);
							}

							// Create empty record with calculated counts
							const emptyStats = new UniqueWalletsHourly();
							emptyStats.hour = new Date(currentHour);
							emptyStats.total_wallets = walletMostRecentCategory.size;

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
				batchSize = 0;
				batchStart = new Date();
			}

			// Move to next hour
			currentHour.setHours(currentHour.getHours() + 1);
		}

		console.timeEnd("Total calculation time");
		console.log(`[UniqueWalletsService] Completed calculation for all hours`);
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

	/**
	 * Updates unique wallet stats incrementally, processing a limited number of hours each run.
	 * Scheduled to run every minute.
	 */
	public async incrementalUpdateStats(
		manager: EntityManager,
		maxHoursToProcess: number = 10
	) {
		console.log(
			`[UniqueWalletsService] Starting incremental update of wallet statistics`
		);
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

		// 4. Setup processing range - start from the last hour (to recalculate it)
		const startHour = new Date(lastProcessedHour);
		let currentHour = new Date(startHour);

		// 5. Determine end hour (max hours to process or latest data hour, whichever comes first)
		const maxEndHour = new Date(startHour);
		maxEndHour.setHours(maxEndHour.getHours() + maxHoursToProcess);
		const endHour = maxEndHour < latestDataHour ? maxEndHour : latestDataHour;

		console.log(
			`[UniqueWalletsService] Processing from ${startHour.toISOString()} to ${endHour.toISOString()}`
		);
		console.log(
			`[UniqueWalletsService] Will process up to ${maxHoursToProcess} hours in this run`
		);

		// 6. Performance optimization: Query batching
		let processedCount = 0;
		let lastStats: UniqueWalletsHourly | null = null;

		// Get the hour before our start to get the initial stats
		if (startHour.getTime() > new Date(0).getTime()) {
			const previousHour = new Date(startHour);
			previousHour.setHours(previousHour.getHours() - 1);
			lastStats = await manager.findOne(UniqueWalletsHourly, {
				where: { hour: previousHour },
			});
		}

		// 7. Process each hour in the limited range
		while (currentHour <= endHour && processedCount < maxHoursToProcess) {
			const hourKey = currentHour.toISOString();
			console.log(`[UniqueWalletsService] Processing hour: ${hourKey}`);

			await manager.connection.transaction(async (transactionManager) => {
				try {
					// Check if this hour has any data
					const [hasData] = await transactionManager.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM account_hourly_balance 
                        WHERE hour = '${hourKey}'
                        LIMIT 1
                    ) as has_data
                `);

					if (hasData.has_data) {
						// FIXED: Use standard CTE without MATERIALIZED keyword
						const mostRecentCategoriesQuery = `
                        WITH RankedWallets AS (
                            SELECT DISTINCT ON (account_identifier) 
                                account_identifier, 
                                wallet_category
                            FROM 
                                account_hourly_balance
                            WHERE 
                                hour <= '${hourKey}'
                            ORDER BY 
                                account_identifier, 
                                hour DESC
                        )
                        SELECT 
                            wallet_category,
                            COUNT(*) as count
                        FROM 
                            RankedWallets
                        GROUP BY 
                            wallet_category
                    `;

						// Get counts directly grouped by category
						const categoryCounts = await transactionManager.query(
							mostRecentCategoriesQuery
						);

						// Count total unique wallets
						const [totalCount] = await transactionManager.query(`
                        SELECT COUNT(DISTINCT account_identifier) as total
                        FROM account_hourly_balance
                        WHERE hour <= '${hourKey}'
                    `);

						// Create new stats record
						const hourlyStats = new UniqueWalletsHourly();
						hourlyStats.hour = new Date(currentHour);
						hourlyStats.total_wallets = parseInt(totalCount.total);

						// Initialize all category counts to 0
						hourlyStats.plankton_count = 0;
						hourlyStats.shrimp_count = 0;
						hourlyStats.crab_count = 0;
						hourlyStats.octopus_count = 0;
						hourlyStats.fish_count = 0;
						hourlyStats.dolphin_count = 0;
						hourlyStats.shark_count = 0;
						hourlyStats.whale_count = 0;
						hourlyStats.humpback_count = 0;

						// Set the counts from our grouped query
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
						lastStats = hourlyStats;

						console.log(
							`[UniqueWalletsService] Calculated stats for hour ${hourKey}: ${hourlyStats.total_wallets} total unique wallets`
						);
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
						lastStats = copiedStats;

						console.log(
							`[UniqueWalletsService] Copied stats for hour ${hourKey}`
						);
					}
				} catch (error) {
					console.error(
						`[UniqueWalletsService] Error processing hour ${hourKey}:`,
						error
					);
					throw error;
				}
			});

			processedCount++;
			currentHour.setHours(currentHour.getHours() + 1);
		}

		console.timeEnd("Incremental update time");
		console.log(`[UniqueWalletsService] Processed ${processedCount} hours`);
		console.log(
			`[UniqueWalletsService] Next run will start at: ${currentHour.toISOString()}`
		);

		return processedCount;
	}

	/**
	 * Phiên bản tối ưu cho VPS có ít tài nguyên
	 */
	public async incrementalUpdateStatsOptimized(
		manager: EntityManager,
		maxHoursToProcess: number = 60 // Giảm số giờ mỗi lần chạy để giảm tải
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
