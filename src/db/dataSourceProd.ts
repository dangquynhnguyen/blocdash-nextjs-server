import dotenv from "dotenv";
import path from "path";
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { Transaction } from "../entities/Transaction";
import { User } from "../entities/User";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	synchronize: true,
	dropSchema: false,
	logging: true,
	// extra: {
	// 	ssl: {
	// 		rejectUnauthorized: false,
	// 	},
	// },
	// ssl: true,
	ssl: false,
	entities: [User, Transaction],
	migrations: [path.join(__dirname, "/migrations/*")],
};

export default new DataSource({
	...connectionOptions,
});
