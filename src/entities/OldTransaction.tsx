import "reflect-metadata";
import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@ObjectType()
@Entity()
export class OldTransaction extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryColumn("bigint", { unique: true })
	block_height: number;

	@Field()
	@Column()
	parent_hash: string;

	@Field()
	@Column()
	block_hash: string;

	@Field()
	@Column()
	transaction_hash: string;

	@Field()
	@Column({ nullable: true })
	from_account_identifier: string;

	@Field()
	@Column({ nullable: true })
	to_account_identifier: string;

	@Field()
	@Column({ nullable: true })
	spender_account_identifier: string;

	@Field()
	@Column()
	transfer_type: string;

	@Field((_type) => Number, { nullable: true })
	@Column("decimal", { nullable: true })
	amount: number;

	@Field((_type) => Number, { nullable: true })
	@Column("decimal", { nullable: true })
	fee: number;

	@Field()
	@Column()
	memo: string;

	@Field()
	@Column()
	created_at: Date;

	@Field((_type) => Number, { nullable: true })
	@Column("decimal", { nullable: true })
	allowance: number;

	@Field((_type) => Number, { nullable: true })
	@Column("decimal", { nullable: true })
	expected_allowance: number;

	@Field((_type) => Date, { nullable: true })
	@Column({ type: "timestamp", nullable: true })
	expires_at: Date | null;

	@Field()
	@Column({ nullable: true })
	icrc1_memo: string;
}
