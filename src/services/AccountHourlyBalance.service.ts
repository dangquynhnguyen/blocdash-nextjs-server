import { startOfHour } from "date-fns";
import { EntityManager, LessThan, MoreThanOrEqual, Not } from "typeorm";
import { AccountHourlyBalance } from "../entities/AccountHourlyBalance";
import { Transaction } from "../entities/Transaction";
import { TransferType } from "../enums/transfer_type.enum";

interface HourlyChange {
	in: number;
	out: number;
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
						in: 0,
						out: 0,
						blocks: [],
					});
				}
				const changes = hourlyChanges.get(key)!;
				changes.out += (tx.amount || 0) + (tx.fee || 0);
				changes.blocks.push(tx.block_height);
			}

			// Process receiver
			if (tx.to_account_identifier) {
				const key = `${tx.to_account_identifier}_${hour}`;
				if (!hourlyChanges.has(key)) {
					hourlyChanges.set(key, {
						in: 0,
						out: 0,
						blocks: [],
					});
				}
				const changes = hourlyChanges.get(key)!;
				changes.in += tx.amount!;
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
					balance: prevBalance?.balance || 0,
					total_in: 0,
					total_out: 0,
					transaction_block_heights: [],
				});
			}

			// Update balances with safe number conversion
			// const currentIn = new Big(balance.total_in) || 0;
			// const currentOut = new Big(balance.total_out) || 0;
			// const currentBalance = new Big(balance.balance) || 0;
			// const incomingAmount = new Big(changes.in || 0);
			// const outgoingAmount = new Big(changes.out || 0);

			balance.total_in += changes.in;
			balance.total_out += changes.out;
			balance.balance = balance.balance + changes.in - changes.out;

			balance.transaction_block_heights = [
				...balance.transaction_block_heights,
				...(changes.blocks || []),
			];

			await manager.save(balance);
		}
	}
}
