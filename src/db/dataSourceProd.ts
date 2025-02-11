import dotenv from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	synchronize: false,
	dropSchema: false,
	logging: true,
	entities: ["src/entities/**/*.ts"],
	migrations: ["src/migrations/**/*.ts"],
};

export default new DataSource({
	...connectionOptions,
});
