import dotenv from "dotenv";
import path from "path";
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { AccountHourlyBalance } from "../entities/AccountHourlyBalance";
import { Transaction } from "../entities/Transaction";
import { UniqueWalletsHourly } from "../entities/UniqueWalletsHourly";
import { User } from "../entities/User";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	synchronize: false,
	dropSchema: false,
	logging: true,
	// extra: {
	// 	ssl: {
	// 		rejectUnauthorized: false,
	// 	},
	// },
	// ssl: true,
	ssl: false,
	entities: [User, Transaction, AccountHourlyBalance, UniqueWalletsHourly],
	migrations: [path.join(path.dirname(__dirname), "/migrations/*")],
	migrationsTableName: "migrations",
};

export default new DataSource({
	...connectionOptions,
});
