import axios from "axios";
import { URL_LEDGER_API_TRANSACTIONS_V2 } from "../constants";
import { OldTransaction } from "../entities/OldTransaction";
import { parseRawTransaction, RawTransaction } from "./parseRawTransaction";

export const fetchAndStoreOldTransactions = async () => {
	try {
		const query_result = await OldTransaction.query(
			`SELECT MAX(block_height) AS max_height FROM old_transaction`
		);

		const max_height = query_result?.[0]?.max_height ?? 0;

		const start_block_height = max_height;
		const end_block_height = 21047697;

		if (start_block_height <= end_block_height) {
			const URL_WTH_QUERY =
				URL_LEDGER_API_TRANSACTIONS_V2 +
				`&sort_by=-block_height&before=${start_block_height}`;
			const response = await axios.get(URL_WTH_QUERY);
			const transactions: RawTransaction[] = response.data.blocks;

			if (!Array.isArray(transactions) || transactions.length === 0) {
				console.log("No transactions found from API.");
				return;
			}

			// Sắp xếp transactions theo block_height tăng dần
			const sortedTransactions = transactions.sort(
				(a, b) => parseFloat(a.block_height) - parseFloat(b.block_height)
			);

			// Assuming transactions is an array of transaction objects
			for (const rawTx of sortedTransactions) {
				// Lấy block_height làm primary key
				const blockHeight = parseFloat(rawTx.block_height);

				// Kiểm tra xem DB đã có transaction này chưa
				const existingTransaction = await OldTransaction.findOne({
					where: { block_height: blockHeight },
				});

				if (existingTransaction) {
					console.log(
						`Transaction with block_height ${rawTx.block_height} already exists. Skipping...`
					);
					continue;
				}

				const parsedData = parseRawTransaction(rawTx);

				let newTransaction = OldTransaction.create(parsedData);

				// console.log(transaction);
				await OldTransaction.save(newTransaction);
			}

			console.log("Transactions fetched and stored successfully!");
		}
	} catch (error) {
		console.error("Error fetching or storing transactions:", error);
	}
};
