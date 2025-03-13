import "reflect-metadata";
import { Field, ID, Int, ObjectType } from "type-graphql";
import {
	BaseEntity,
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	PrimaryColumn,
} from "typeorm";
import { getWalletCategory, WalletCategory } from "../enums/wallet.enum";

@ObjectType()
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
