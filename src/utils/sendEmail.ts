import nodemailer from "nodemailer";
import path from "path";
var inlineBase64 = require("nodemailer-plugin-inline-base64");

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string) {
	const transporter = nodemailer.createTransport({
		host: "mail.privateemail.com",
		port: 465,
		secure: true, // true for port 465, false for other ports
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASSWORD,
		},
		tls: {
			rejectUnauthorized: false, // avoid NodeJs self signed certificate error
		},
	});

	transporter.use("compile", inlineBase64());

	// send mail with defined transport object
	const info = await transporter.sendMail({
		from: '"Blocdash Support" <noreply@blocdash.com>', // sender address
		to, // list of receivers
		subject: "Reset your password", // Subject line
		html, // html body
		attachDataUrls: true,
		attachments: [
			{
				filename: "logo.png",
				path: path.join(__dirname, "../public/logo.png"),
				cid: "logo", //same cid value as in the html img src
			},
		],
	});

	console.log("Message sent: %s", info.messageId);
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
