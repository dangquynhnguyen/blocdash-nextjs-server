import "reflect-metadata";
import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from "typeorm";

@ObjectType()
@Index("idx_to_created_at", ["to_account_identifier", "created_at"])
@Index("idx_from_created_at", ["from_account_identifier", "created_at"])
@Entity()
export class Transaction extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryColumn("bigint", { unique: true })
	block_height: number;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
	parent_hash: string;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
	block_hash: string;

	@Field()
	@Column({ length: 64, type: "char", nullable: true })
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
	@Column({ length: 10, nullable: true }) // Enum-like: TRANSFER, MINT, BURN, etc
	transfer_type: string;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	amount: number | null;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	fee: number | null;

	@Field()
	@Column()
	created_at: Date;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	allowance: number | null;

	@Field((_type) => Number, { nullable: true })
	@Column("numeric", { precision: 38, scale: 8, nullable: true })
	expected_allowance: number | null;

	@Field((_type) => Date, { nullable: true })
	@Column({ type: "timestamp", nullable: true })
	expires_at: Date | null;
}
