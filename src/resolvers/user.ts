import argon2 from "argon2";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { __prod__, COOKIE_NAME } from "../constants";
import { User } from "../entities/User";
import { TokenModel } from "../models/Token";
import { ChangePasswordInput } from "../types/ChangePassword";
import { Context } from "../types/Context";
import { ForgotPasswordInput } from "../types/ForgotPassword";
import { LoginInput } from "../types/LoginInput";
import { RegisterInput } from "../types/RegisterInput";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { sendEmail } from "../utils/sendEmail";
import { validateRegisterInput } from "../utils/validateRegisterInput";

@Resolver()
export class UserResolver {
	@Query((_return) => User, { nullable: true })
	async me(@Ctx() { req }: Context): Promise<User | undefined | null> {
		if (!req.session.userId) return null;
		const user = await User.findOne({ where: { id: req.session.userId } });
		return user;
	}

	@Mutation((_return) => UserMutationResponse, { nullable: true })
	async register(
		@Arg("registerInput") registerInput: RegisterInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		const validateRegisterInputErrors = validateRegisterInput(registerInput);
		if (validateRegisterInputErrors !== null)
			return {
				code: 400,
				success: false,
				...validateRegisterInputErrors,
			};

		try {
			const { username, email, password } = registerInput;
			const existingUser = await User.findOne({
				where: [{ username }, { email }],
			});
			if (existingUser)
				return {
					code: 400,
					success: false,
					message: "duplicated username or email",
					errors: [
						{
							field: existingUser.username === username ? username : email,
							message: `${
								existingUser.username === username ? "Username" : "Email"
							} already taken`,
						},
					],
				};
			const hashedPassword = await argon2.hash(password);
			let newUser = User.create({
				username,
				password: hashedPassword,
				email,
			});

			newUser = await User.save(newUser);
			req.session.userId = newUser.id;

			return {
				code: 200,
				success: true,
				message: "User registration successful ",
				user: newUser,
			};
		} catch (error: any) {
			console.log(error);
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`,
			};
		}
	}

	@Mutation((_return) => UserMutationResponse)
	async login(
		@Arg("loginInput") { usernameOrEmail, password }: LoginInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		try {
			const existingUser = await User.findOne({
				where: usernameOrEmail.includes("@")
					? { email: usernameOrEmail }
					: { username: usernameOrEmail },
			});

			if (!existingUser)
				return {
					code: 400,
					success: false,
					message: "User not found",
					errors: [
						{
							field: "usernameOrEmail",
							message: "Username or email incorrect",
						},
					],
				};

			const passwordValid = await argon2.verify(
				existingUser.password,
				password
			);

			if (!passwordValid)
				return {
					code: 400,
					success: false,
					message: "Wrong password",
					errors: [
						{
							field: "password",
							message: "Wrong password",
						},
					],
				};

			// Create session and return cookie
			req.session.userId = existingUser.id;

			return {
				code: 200,
				success: true,
				message: "Logged in successfully",
				user: existingUser,
			};
		} catch (error: any) {
			console.log(error);
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`,
			};
		}
	}

	@Mutation((_return) => Boolean)
	logout(@Ctx() { req, res }: Context): Promise<boolean> {
		return new Promise((resolve, _reject) => {
			res.clearCookie(COOKIE_NAME);
			req.session.destroy((error) => {
				if (error) {
					console.log("DESTROYING SESSION ERROR", error);
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	@Mutation((_return) => Boolean)
	async forgotPassword(
		@Arg("forgotPasswordInput") forgotPasswordInput: ForgotPasswordInput
	): Promise<boolean> {
		const user = await User.findOne({
			where: {
				email: forgotPasswordInput.email,
			},
		});

		if (!user) return true;

		await TokenModel.findOneAndDelete({
			where: {
				userId: user.id,
			},
		});

		const resetToken = uuidv4();
		const hashedResetToken = await argon2.hash(resetToken);

		// save token to database
		await new TokenModel({
			userId: user.id,
			token: hashedResetToken,
		}).save();

		// send reset password link to user via email
		await sendEmail(
			forgotPasswordInput.email,
			`<a href="${
				__prod__ ? process.env.CORS_ORIGIN_PROD : process.env.CORS_ORIGIN_DEV
			}/change-password?token=${resetToken}&userId=${user.id}">
			Click here to reset your password 
			</a>`
		);
		return true;
	}

	@Mutation((_return) => UserMutationResponse)
	async changePassword(
		@Arg("token") token: string,
		@Arg("userId") userId: number,
		@Arg("changePasswordInput") changePasswordInput: ChangePasswordInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		if (changePasswordInput.newPassword.length <= 2) {
			return {
				code: 400,
				success: false,
				message: "Invalid password",
				errors: [
					{ field: "newPassword", message: "Length must be greater than 2" },
				],
			};
		}

		try {
			const resetPasswordTokenRecord = await TokenModel.findOne({ userId });
			if (!resetPasswordTokenRecord) {
				return {
					code: 400,
					success: false,
					message: "Invalid or expired password reset token",
					errors: [
						{
							field: "token",
							message: "Invalid or expired password reset token",
						},
					],
				};
			}

			const resetPasswordTokenValid = argon2.verify(
				resetPasswordTokenRecord.token,
				token
			);

			if (!resetPasswordTokenValid) {
				return {
					code: 400,
					success: false,
					message: "Invalid or expired password reset token",
					errors: [
						{
							field: "token",
							message: "Invalid or expired password reset token",
						},
					],
				};
			}

			const user = await User.findOne({
				where: { id: userId },
			});

			if (!user) {
				return {
					code: 400,
					success: false,
					message: "User no longer exists",
					errors: [
						{
							field: "token",
							message: "User no longer exists",
						},
					],
				};
			}

			const updatedPassword = await argon2.hash(
				changePasswordInput.newPassword
			);
			await User.update({ id: userId }, { password: updatedPassword });

			await resetPasswordTokenRecord.deleteOne();

			req.session.userId = user.id;
			return {
				code: 200,
				success: true,
				message: "User password reset successfully",
				user: user,
			};
		} catch (error: any) {
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`,
			};
		}
	}
}
