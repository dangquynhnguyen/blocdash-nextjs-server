import axios from "axios";
import { Transaction } from "../entities/Transaction";

export const fetchAndStoreTransactions = async () => {
	try {
		const limit = 1000;
		const response = await axios.get(
			`https://ledger-api.internetcomputer.org/transactions?limit=${limit}`
		);
		const transactions = response.data.blocks;

		// Assuming transactions is an array of transaction objects
		for (const transaction of transactions) {
			const existingTransaction = await Transaction.findOne({
				where: { block_height: parseFloat(transaction.block_height) },
			});

			if (existingTransaction) {
				console.log(
					`Transaction with block_height ${transaction.block_height} already exists. Skipping...`
				);
				continue;
			}

			let newTransaction = Transaction.create({
				block_height: parseFloat(transaction.block_height),
				parent_hash: transaction.parent_hash,
				block_hash: transaction.block_hash,
				transaction_hash: transaction.transaction_hash,
				from_account_identifier: transaction.from_account_identifier,
				to_account_identifier: transaction.to_account_identifier,
				spender_account_identifier: transaction.spender_account_identifier,
				transfer_type: transaction.transfer_type,
				amount: parseFloat(transaction.amount) / 100000000,
				fee: parseFloat(transaction.fee) / 100000000,
				memo: transaction.memo,
				created_at: new Date(transaction.created_at * 1000),
				allowance: parseFloat(transaction.allowance) / 100000000,
				expected_allowance:
					parseFloat(transaction.expected_allowance) / 100000000,
				expires_at: transaction.expires_at
					? new Date(transaction.expires_at * 1000)
					: null,
				icrc1_memo: transaction.icrc1_memo,
				///
			});

			// console.log(transaction);
			await Transaction.save(newTransaction);
		}

		console.log("Transactions fetched and stored successfully!");
	} catch (error) {
		console.error("Error fetching or storing transactions:", error);
	}
};
