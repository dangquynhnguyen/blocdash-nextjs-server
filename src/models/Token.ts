import { getModelForClass, prop } from "@typegoose/typegoose";
import mongoose from "mongoose";
import { RESET_PASSWORD_TOKEN_EXPIRES } from "../constants";

export class Token {
	_id!: mongoose.Types.ObjectId;

	@prop({ required: true })
	userId!: number;

	@prop({ required: true })
	token!: string;

	@prop({ default: Date.now, expires: RESET_PASSWORD_TOKEN_EXPIRES })
	createdAt: Date;
}

export const TokenModel = getModelForClass(Token);
