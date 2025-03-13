import "reflect-metadata";
import { Field, ID, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	Index,
	PrimaryColumn,
} from "typeorm";
import { getWalletCategory, WalletCategory } from "../enums/wallet.enum";

@ObjectType()
@Index("idx_ahb_account_hour", ["account_identifier", "hour"])
@Index("idx_ahb_wallet_category_hour", ["wallet_category", "hour"])
@Index("idx_ahb_hour", ["hour"]) // For fast filtering by hour
@Index("idx_ahb_hour_wallet_account", [
	"hour",
	"wallet_category",
	"account_identifier",
]) // For the wallet count query
@Entity()
export class AccountHourlyBalance extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryColumn({ length: 64, type: "char" })
	account_identifier: string; // 64 bytes

	@Field()
	@PrimaryColumn({ type: "timestamp" })
	hour: Date; // 8 bytes

	@Field()
	@Column("numeric", { precision: 38, scale: 8 })
	balance: number;

	@Field()
	@Column("numeric", { precision: 38, scale: 8 })
	total_in: number;

	@Field()
	@Column("numeric", { precision: 38, scale: 8 })
	total_out: number;

	@Field(() => [Int], { nullable: true })
	@Column("bigint", { array: true, nullable: true })
	transaction_block_heights: number[];

	@Field(() => WalletCategory)
	@Column({
		type: "enum",
		enum: WalletCategory,
		default: WalletCategory.PLANKTON,
	})
	wallet_category: WalletCategory;

	@BeforeInsert()
	@BeforeUpdate()
	updateWalletCategory() {
		const balanceNum = this.balance;
		this.wallet_category = getWalletCategory(balanceNum);
	}
}
