require("dotenv").config();
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import MongoStore from "connect-mongo";
import cors from "cors";
import express, { Application } from "express";
import session from "express-session";
import mongoose from "mongoose";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { DataSource } from "typeorm";
import { __prod__, COOKIE_NAME } from "./constants";
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
	app.use(
		cors({
			origin: "http://localhost:3000",
			credentials: true,
		})
	);

	// Session/Cookie store
	const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@blocdash.llh3i.mongodb.net/?retryWrites=true&w=majority&appName=blocdash`;
	await mongoose.connect(mongoUrl);
	console.log("MongoDB connected");

	app.use(
		session({
			name: COOKIE_NAME,
			store: MongoStore.create({ mongoUrl }),
			cookie: {
				maxAge: 1000 * 60 * 60, // one hour
				httpOnly: true, // JS front end cannot acces the cookie
				secure: __prod__, // cookie only work in https
				sameSite: "lax", // protection against CSRF
				// domain
			},
			secret: process.env.SESSION_SECRET_DEV_PROD as string,
			saveUninitialized: false, // don't save empty sessions, right from the start
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, UserResolver],
			validate: false,
		}),
		context: ({ req, res }) => ({ req, res }),
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
