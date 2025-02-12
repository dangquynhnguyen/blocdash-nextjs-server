import dotenv from "dotenv";
import path from "path";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	synchronize: false,
	dropSchema: false,
	logging: true,
	extra: {
		ssl: {
			rejectUnauthorized: false,
		},
	},
	ssl: true,
	entities: ["src/entities/**/*.ts"],
	migrations: [path.join(__dirname, "/migrations/*")],
};

export default new DataSource({
	...connectionOptions,
});
