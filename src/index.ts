require("dotenv").config();
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import express, { Application } from "express";
import mongoose from "mongoose";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { HelloResolver } from "./resolvers/hello";
import { UserResolver } from "./resolvers/user";

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

	// Session/Cookie store
	await mongoose.connect(
		`mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@blocdash.llh3i.mongodb.net/?retryWrites=true&w=majority&appName=blocdash`
	);

	console.log("MongoDB connected");

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, UserResolver],
			validate: false,
		}),
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
	});
	await apolloServer.start();
	apolloServer.applyMiddleware({ app: app as any, cors: false });

	const PORT = process.env.PORT || 4000;
	app.listen(PORT, () =>
		console.log(
			`Server started on port ${PORT}. GraphQL server started on localhost ${PORT}${apolloServer.graphqlPath}`
		)
	);
};

main().catch((error) => console.log(error));
