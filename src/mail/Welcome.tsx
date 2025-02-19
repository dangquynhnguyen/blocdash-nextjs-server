/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import React from "react";

export default function Welcome() {
	return (
		<Html>
			<Head />
			<Body style={main}>
				<Preview>Welcome to Blocdash</Preview>
				<Container style={container}>
					<Section style={coverSection}>
						<Section style={imageSection}>
							<img src="cid:logo" width="45" height="45" alt="Logo" />
						</Section>
						<Section style={upperSection}>
							<Heading style={h1}>Welcome to Blocdash</Heading>
							<Text style={mainText}>Hey there,</Text>
							<Text style={mainText}>
								Welcome to Blocdash, the world's first platform for ICP
								blockchain data and intelligence.
							</Text>
							<Text style={mainText}>
								Feel free to reach out if you have any questions or feedback.
							</Text>
						</Section>
						<Hr />
						<Section style={lowerSection}>
							<Text style={cautionText}>
								Blocdash will never email you and ask you to disclose or verify
								your password, credit card, or banking account number.
							</Text>
						</Section>
					</Section>
					<Text style={footerText}>
						This message was produced and distributed by{" "}
						<Link href="https://www.blocdash.com">Blocdash.com</Link>
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: "#fff",
	color: "#212121",
};

const container = {
	padding: "20px",
	margin: "0 auto",
	backgroundColor: "#eee",
};

const h1 = {
	color: "#333",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
	fontSize: "20px",
	fontWeight: "bold",
	marginBottom: "15px",
};

const text = {
	color: "#333",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
	fontSize: "14px",
	margin: "24px 0",
};

const button = {
	backgroundColor: "#ff621a",
	borderRadius: "4px",
	color: "#fff",
	fontFamily: "'Open Sans', 'Helvetica Neue', Arial",
	fontSize: "15px",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "block",
	width: "210px",
	padding: "14px 7px",
};

const imageSection = {
	display: "flex",
	padding: "35px 0 0 35px",
	alignItems: "center",
	justifyContent: "left",
};

const coverSection = { backgroundColor: "#fff" };

const upperSection = { padding: "25px 35px" };

const lowerSection = { padding: "25px 35px" };

const footerText = {
	...text,
	fontSize: "12px",
	padding: "0 20px",
};

const validityText = {
	...text,
	margin: "0px",
	textAlign: "center" as const,
};

const verificationSection = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

const mainText = { ...text, marginBottom: "14px" };

const cautionText = { ...text, margin: "0px" };
