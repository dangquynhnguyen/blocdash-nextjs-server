import axios from "axios";
import { URL_LEDGER_API_TRANSACTIONS_V1 } from "../constants";
import { Transaction } from "../entities/Transaction";
import { parseRawTransaction, RawTransaction } from "./parseRawTransaction";

export const fetchAndStoreTransactions = async () => {
	try {
		const response = await axios.get(URL_LEDGER_API_TRANSACTIONS_V1);
		const transactions: RawTransaction[] = response.data.blocks;

		//
		if (!Array.isArray(transactions) || transactions.length === 0) {
			console.log("No transactions found from API.");
			return;
		}

		// Assuming transactions is an array of transaction objects
		for (const rawTx of transactions) {
			// Lấy block_height làm primary key
			const blockHeight = parseFloat(rawTx.block_height);

			// Kiểm tra xem DB đã có transaction này chưa
			const existingTransaction = await Transaction.findOne({
				where: { block_height: blockHeight },
			});

			if (existingTransaction) {
				console.log(
					`Transaction with block_height ${rawTx.block_height} already exists. Skipping...`
				);
				continue;
			}

			const parsedData = parseRawTransaction(rawTx);

			let newTransaction = Transaction.create(parsedData);

			// console.log(transaction);
			await Transaction.save(newTransaction);
		}

		console.log("Transactions fetched and stored successfully!");
	} catch (error) {
		console.error("Error fetching or storing transactions:", error);
	}
};
