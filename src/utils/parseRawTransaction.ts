import { Transaction } from "../entities/Transaction";

export type RawTransaction = {
	block_height: string;
	parent_hash: string;
	block_hash: string;
	transaction_hash: string;
	from_account_identifier: string;
	to_account_identifier: string;
	spender_account_identifier: string;
	transfer_type: string;
	amount: string;
	fee: string;
	memo: string;
	created_at: number;
	allowance: string;
	expected_allowance: string;
	expires_at?: number;
	icrc1_memo?: string;
};

export function parseRawTransaction(
	rawTx: RawTransaction
): Partial<Transaction> {
	return {
		block_height: parseFloat(rawTx.block_height),
		parent_hash: rawTx.parent_hash,
		block_hash: rawTx.block_hash,
		transaction_hash: rawTx.transaction_hash,
		from_account_identifier: rawTx.from_account_identifier,
		to_account_identifier: rawTx.to_account_identifier,
		spender_account_identifier: rawTx.spender_account_identifier,
		transfer_type: rawTx.transfer_type,

		// Chuyển amount & fee từ đơn vị gốc sang đơn vị chuẩn
		amount: parseFloat(rawTx.amount) / 100000000,
		fee: parseFloat(rawTx.fee) / 100000000,

		memo: rawTx.memo,
		// API trả về created_at là số giây => nhân 1000 để ra milliseconds
		created_at: new Date(rawTx.created_at * 1000),

		allowance: parseFloat(rawTx.allowance) / 100000000,
		expected_allowance: parseFloat(rawTx.expected_allowance) / 100000000,

		// Kiểm tra expires_at, nếu có thì cũng nhân 1000
		expires_at: rawTx.expires_at ? new Date(rawTx.expires_at * 1000) : null,
		icrc1_memo: rawTx.icrc1_memo,
	};
}
