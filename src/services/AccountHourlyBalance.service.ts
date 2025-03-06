import { startOfHour } from "date-fns";
import { EntityManager, LessThan, MoreThanOrEqual, Not } from "typeorm";
import { AccountHourlyBalance } from "../entities/AccountHourlyBalance";
import { Transaction } from "../entities/Transaction";
import { TransferType } from "../enums/transfer_type.enum";

import { Decimal } from "decimal.js";

// Match PostgreSQL numeric(38,8) precision
Decimal.set({
	precision: 38,
	rounding: Decimal.ROUND_DOWN,
	toExpPos: 38,
	toExpNeg: -8,
	maxE: 38,
	minE: -8,
});

interface HourlyChange {
	in: Decimal;
	out: Decimal;
	blocks: number[];
}

export class AccountBalanceService {
	private async getCurrentBalance(
		accountId: string,
		hour: Date,
		manager: EntityManager
	): Promise<AccountHourlyBalance | null> {
		return await manager.findOne(AccountHourlyBalance, {
			where: {
				account_identifier: accountId,
				hour: hour,
			},
		});
	}

	private async getPreviousBalance(
		accountId: string,
		hour: Date,
		manager: EntityManager
	): Promise<AccountHourlyBalance | null> {
		return await manager.findOne(AccountHourlyBalance, {
			where: {
				account_identifier: accountId,
				hour: LessThan(hour),
			},
			order: { hour: "DESC" },
		});
	}

	private async getLastProcessedBlockHeight(
		manager: EntityManager
	): Promise<number> {
		// Fix: Use LATERAL to handle array unnesting
		const result = await manager.query(`
            SELECT MAX(block_height) as max_height
            FROM (
                SELECT unnest(transaction_block_heights) as block_height
                FROM account_hourly_balance
            ) as heights
        `);

		return result[0]?.max_height || 0;
	}

	private toDecimal(value: number | string | null | undefined): Decimal {
		try {
			return new Decimal(value || 0);
		} catch (error) {
			console.error("Error converting to Decimal:", value);
			return new Decimal(0);
		}
	}

	public async processNewTransactions(manager: EntityManager): Promise<void> {
		// Get last processed block height
		const lastBlockHeight = await this.getLastProcessedBlockHeight(manager);

		// Get new transactions
		const newTransactions = await manager.find(Transaction, {
			where: {
				block_height: MoreThanOrEqual(lastBlockHeight),
				transfer_type: Not(TransferType.APPROVE),
			},
			order: { block_height: "ASC" },
		});

		// Group transactions by account and hour
		const hourlyChanges = new Map<string, HourlyChange>();

		for (const tx of newTransactions) {
			const hour = startOfHour(tx.created_at).toISOString();

			// Process sender
			if (tx.from_account_identifier) {
				const key = `${tx.from_account_identifier}_${hour}`;
				if (!hourlyChanges.has(key)) {
					hourlyChanges.set(key, {
						in: new Decimal(0),
						out: new Decimal(0),
						blocks: [],
					});
				}
				const changes = hourlyChanges.get(key)!;
				changes.out = changes.out
					.plus(this.toDecimal(tx.amount))
					.plus(this.toDecimal(tx.fee));
				changes.blocks.push(tx.block_height);
			}

			// Process receiver
			if (tx.to_account_identifier) {
				const key = `${tx.to_account_identifier}_${hour}`;
				if (!hourlyChanges.has(key)) {
					hourlyChanges.set(key, {
						in: new Decimal(0),
						out: new Decimal(0),
						blocks: [],
					});
				}
				const changes = hourlyChanges.get(key)!;
				changes.in = changes.in.plus(this.toDecimal(tx.amount));
				changes.blocks.push(tx.block_height);
			}
		}

		// Update or create AccountHourlyBalance records
		for (const [key, changes] of hourlyChanges.entries()) {
			const [accountId, hourStr] = key.split("_");
			const hour = new Date(hourStr);

			let balance = await this.getCurrentBalance(accountId, hour, manager);

			if (!balance) {
				const prevBalance = await this.getPreviousBalance(
					accountId,
					hour,
					manager
				);

				balance = manager.create(AccountHourlyBalance, {
					account_identifier: accountId,
					hour: hour,
					balance: this.toDecimal(prevBalance?.balance).toNumber(),
					total_in: 0,
					total_out: 0,
					transaction_block_heights: [],
				});
			}

			// Update using Decimal operations
			const newTotalIn = this.toDecimal(balance.total_in).plus(changes.in);
			const newTotalOut = this.toDecimal(balance.total_out).plus(changes.out);
			const newBalance = this.toDecimal(balance.balance)
				.plus(changes.in)
				.minus(changes.out);

			// Convert back to number with proper precision
			balance.total_in = newTotalIn.toNumber();
			balance.total_out = newTotalOut.toNumber();
			balance.balance = newBalance.toNumber();

			// Remove duplicate block heights
			balance.transaction_block_heights = Array.from(
				new Set([
					...(balance.transaction_block_heights || []),
					...changes.blocks,
				])
			);

			await manager.save(balance);
		}
	}
}
