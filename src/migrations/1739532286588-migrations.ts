import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1739532286588 implements MigrationInterface {
	name = "Migrations1739532286588";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "transaction" ("block_height" bigint NOT NULL, "parent_hash" character varying NOT NULL, "block_hash" character varying NOT NULL, "transaction_hash" character varying NOT NULL, "from_account_identifier" character varying, "to_account_identifier" character varying, "spender_account_identifier" character varying, "transfer_type" character varying NOT NULL, "amount" numeric, "fee" numeric, "memo" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL, "allowance" numeric, "expected_allowance" numeric, "expires_at" TIMESTAMP, "icrc1_memo" character varying, CONSTRAINT "PK_978d2353f5c22ee7bd1a84d1e4b" PRIMARY KEY ("block_height"))`
		);
		await queryRunner.query(
			`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "user"`);
		await queryRunner.query(`DROP TABLE "transaction"`);
	}
}
