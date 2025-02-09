import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string) {
	const transporter = nodemailer.createTransport({
		host: "smtp.ethereal.email",
		port: 587,
		secure: false, // true for port 465, false for other ports
		auth: {
			user: "maddison53@ethereal.email",
			pass: "jn7jnAPss4f63QBp6D",
		},
		tls: {
			rejectUnauthorized: false, // avoid NodeJs self signed certificate error
		},
	});

	// send mail with defined transport object
	const info = await transporter.sendMail({
		from: '"Blocdash admin 👻" <admin@blocdash.com>', // sender address
		to, // list of receivers
		subject: "Change Password", // Subject line
		html, // html body
	});

	console.log("Message sent: %s", info.messageId);
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
