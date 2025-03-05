import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1741217571473 implements MigrationInterface {
    name = 'Auto1741217571473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_tx_block_height"`);
        await queryRunner.query(`DROP INDEX "public"."idx_tx_created_at"`);
        await queryRunner.query(`CREATE TABLE "account_hourly_balance" ("account_identifier" character(64) NOT NULL, "hour" TIMESTAMP NOT NULL, "balance" numeric(38,8) NOT NULL, "total_in" numeric(38,8) NOT NULL, "total_out" numeric(38,8) NOT NULL, "transaction_block_heights" bigint array, "wallet_category" "public"."account_hourly_balance_wallet_category_enum" NOT NULL DEFAULT 'PLANKTON', CONSTRAINT "PK_4788bd651103a796eb4f7f7a90a" PRIMARY KEY ("account_identifier", "hour"))`);
        await queryRunner.query(`CREATE INDEX "idx_ahb_wallet_category_hour" ON "account_hourly_balance" ("wallet_category", "hour") `);
        await queryRunner.query(`CREATE INDEX "idx_ahb_account_hour" ON "account_hourly_balance" ("account_identifier", "hour") `);
        await queryRunner.query(`CREATE INDEX "IDX_978d2353f5c22ee7bd1a84d1e4" ON "transaction" ("block_height") `);
        await queryRunner.query(`CREATE INDEX "IDX_bd4c360c8e5745e921df060744" ON "transaction" ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_bd4c360c8e5745e921df060744"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_978d2353f5c22ee7bd1a84d1e4"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ahb_account_hour"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ahb_wallet_category_hour"`);
        await queryRunner.query(`DROP TABLE "account_hourly_balance"`);
        await queryRunner.query(`CREATE INDEX "idx_tx_created_at" ON "transaction" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_tx_block_height" ON "transaction" ("block_height") `);
    }

}
