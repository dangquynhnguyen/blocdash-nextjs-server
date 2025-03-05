import { OldTransaction } from "../entities/OldTransaction";

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
): Partial<OldTransaction> {
	const parseAmount = (value: string | null | undefined): number | null => {
		if (!value) return null;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? null : parsed / 100000000;
	};

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
		amount: parseAmount(rawTx.amount),
		fee: parseAmount(rawTx.fee),

		// API trả về created_at là số giây => nhân 1000 để ra milliseconds
		created_at: new Date(rawTx.created_at * 1000),

		allowance: parseAmount(rawTx.allowance),
		expected_allowance: parseAmount(rawTx.expected_allowance),

		// Kiểm tra expires_at, nếu có thì cũng nhân 1000
		expires_at: rawTx.expires_at ? new Date(rawTx.expires_at * 1000) : null,
	};
}
