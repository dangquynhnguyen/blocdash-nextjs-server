import nodemailer from "nodemailer";

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

	// send mail with defined transport object
	const info = await transporter.sendMail({
		from: '"Blocdash Support" <admin@blocdash.com>', // sender address
		to, // list of receivers
		subject: "Reset your password", // Subject line
		html, // html body
	});

	console.log("Message sent: %s", info.messageId);
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
