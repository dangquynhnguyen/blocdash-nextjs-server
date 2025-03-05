import "reflect-metadata";
import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from "typeorm";

@ObjectType()
@Index("idx_to_created_at", ["to_account_identifier", "created_at"])
@Index("idx_from_created_at", ["from_account_identifier", "created_at"])
@Entity()
export class OldTransaction extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryColumn("bigint", { unique: true })
	block_height: number;

	@Field()
	@Column({ length: 64, type: "char" })
	parent_hash: string;

	@Field()
	@Column({ length: 64, type: "char" })
	block_hash: string;

	@Field()
	@Column({ length: 64, type: "char" })
	transaction_hash: string;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
	from_account_identifier: string;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
	to_account_identifier: string;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
	spender_account_identifier: string;

	@Field()
	@Column({ length: 10 }) // Enum-like: TRANSFER, MINT, BURN, etc
	transfer_type: string;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	amount: number;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	fee: number;

	@Field()
	@Column({ type: "text", nullable: true })
	memo: string;

	@Field()
	@Column()
	created_at: Date;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	allowance: number;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	expected_allowance: number;

	@Field((_type) => Date, { nullable: true })
	@Column({ type: "timestamp", nullable: true })
	expires_at: Date | null;

	@Field()
	@Column({ type: "text", nullable: true })
	icrc1_memo: string;
}
