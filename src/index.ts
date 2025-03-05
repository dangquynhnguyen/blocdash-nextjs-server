require("dotenv").config();
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import MongoStore from "connect-mongo";
import cors from "cors";
import express, { Application } from "express";
import session from "express-session";
import mongoose from "mongoose";
import cron from "node-cron";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { __prod__, COOKIE_NAME } from "./constants";
import AppDataSource from "./db/dataSourceProd";
import { UserResolver } from "./resolvers/user";
import { fetchAndStoreTransactions } from "./utils/fetchAndStoreTransactions";

const app: Application = express();

const main = async () => {
	await AppDataSource.initialize()
		.then(() => {
			console.log("Database connected :", AppDataSource.options.database);
		})
		.catch((error) => console.log("Database", error));

	await AppDataSource.runMigrations();

	app.use(
		cors({
			origin: [
				process.env.CORS_ORIGIN_PROD || "",
				process.env.CORS_ORIGIN_DEV || "",
			],
			credentials: true,
		})
	);
	app.use(express.json());

	// Session/Cookie store
	const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@blocdash.llh3i.mongodb.net/?retryWrites=true&w=majority&appName=blocdash`;
	await mongoose.connect(mongoUrl);
	console.log("MongoDB connected");

	app.set("trust proxy", 1);

	app.use(
		session({
			name: COOKIE_NAME,
			store: MongoStore.create({ mongoUrl }),
			cookie: {
				maxAge: 1000 * 60 * 60, // one hour
				httpOnly: true, // JS front end cannot acces the cookie
				secure: __prod__, // cookie only work in https
				sameSite: "none", // protection against CSRF
			},
			secret: process.env.SESSION_SECRET_DEV_PROD as string,
			saveUninitialized: false, // don't save empty sessions, right from the start
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver],
			validate: false,
		}),
		context: ({ req, res }) => ({ req, res }),
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
	});
	await apolloServer.start();
	apolloServer.applyMiddleware({
		app: app as any,
		cors: {
			origin: [
				process.env.CORS_ORIGIN_PROD || "",
				process.env.CORS_ORIGIN_DEV || "",
			],
			credentials: true,
		},
	});

	const PORT = process.env.PORT || 4000;
	app.listen(PORT, () =>
		console.log(
			`Server started on port ${PORT}. GraphQL server started on localhost ${PORT}${apolloServer.graphqlPath}`
		)
	);

	//////
	// Schedule the heartbeat function to run every hour
	cron.schedule("30 * * * * *", fetchAndStoreTransactions);
};

main().catch((error) => console.log(error));
