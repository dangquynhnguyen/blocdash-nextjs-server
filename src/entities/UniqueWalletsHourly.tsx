import "reflect-metadata";
import { Field, ID, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from "typeorm";

@ObjectType()
@Index("idx_uwh_hour", ["hour"])
@Entity()
export class UniqueWalletsHourly extends BaseEntity {
	@Field(() => ID)
	@PrimaryColumn({ type: "timestamp" })
	hour: Date;

	@Field(() => Int)
	@Column("integer")
	total_wallets: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	plankton_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	shrimp_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	crab_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	octopus_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	fish_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	dolphin_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	shark_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	whale_count: number;

	@Field(() => Int)
	@Column("integer", { default: 0 })
	humpback_count: number;
}
