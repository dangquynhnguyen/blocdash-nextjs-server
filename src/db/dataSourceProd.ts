import dotenv from "dotenv";
import path from "path";
import { __prod__ } from "src/constants";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

let connectionOptions: DataSourceOptions = {
	type: "postgres",
	url: process.env.DB_URL,
	synchronize: false,
	dropSchema: false,
	logging: true,
	...(__prod__
		? {
				extra: {
					ssl: {
						rejectUnauthorized: false,
					},
				},
				ssl: true,
		  }
		: {}),
	...(__prod__ ? {} : { synchronize: true }),
	entities: ["src/entities/**/*.ts"],
	migrations: [path.join(__dirname, "/migrations/*")],
};

export default new DataSource({
	...connectionOptions,
});
