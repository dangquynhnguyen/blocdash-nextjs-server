import dotenv from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	// host: process.env.DB_HOST,
	// port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
	// username: process.env.DB_USERNAME, // postgre username
	// password: process.env.DB_PASSWORD, // postgre password
	// database: process.env.DB_DATABASE, // postgre db, needs to be created before
	synchronize: false,
	dropSchema: false,
	logging: true,
	// logger: "file",
	entities: ["dist/entities/*.js"],
	migrations: ["dist/migrations/*.js"],
	// migrations: ["src/migrations/**/*.ts"],
	// migrationsRun: true,
	//   subscribers: ['src/subscriber/**/*.ts'],
	//   migrationsTableName: 'migration_table',
};

export default new DataSource({
	...connectionOptions,
});
