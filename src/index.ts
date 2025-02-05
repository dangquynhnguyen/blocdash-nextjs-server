require("dotenv").config();
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import express, { Application } from "express";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { HelloResolver } from "./resolvers/hello";

const main = async () => {
	const AppDataSource = new DataSource({
		type: "postgres",
		database: "blocdash",
		username: process.env.DB_USERNAME_DEV,
		password: process.env.DB_PASSWORD_DEV,
		logging: true,
		synchronize: true,
		entities: [User],
	});
	AppDataSource.initialize()
		.then(() => {
			console.log("Database connected :", AppDataSource.options.database);
		})
		.catch((error) => console.log("Database", error));

	const app: Application = express();
	const apolloServer = new ApolloServer({
		schema: await buildSchema({ resolvers: [HelloResolver], validate: false }),
		// context: ({req, res} : Context ) => ({req, res})
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
	});
	await apolloServer.start();
	apolloServer.applyMiddleware({ app: app as any, cors: false });

	app.listen(4000, () => console.log("Server started on port 4000"));
};

main().catch((error) => console.log(error));
