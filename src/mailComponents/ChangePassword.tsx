/* eslint-disable react/no-unescaped-entities */
import {
	Box,
	Button,
	createTheme,
	ThemeProvider,
	Typography,
} from "@mui/material";
import React from "react";
import { colors } from "../theme";

type Props = {
	to: string;
	url: string;
};

const theme = createTheme({
	palette: {
		primary: colors.logo,
	},
});

export default function ChangePassword(props: Props) {
	return (
		<ThemeProvider theme={theme}>
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
				}}
			>
				<Box maxWidth={600} rowGap={500}>
					<img src="../public/logo.svg" alt="Blocdash" height={50}></img>
					<Typography p="1.5rem 0" fontSize="1.3rem" fontWeight={550}>
						Reset your password
					</Typography>
					<Typography color={colors.primary[500]}>
						We've received a request to reset the password for the Blocdash
						account associated with
						{<link href={"mailto:" + props.to}> {props.to}</link>}. No changes
						have been made to your account yet. To reset your password, click on
						the button below.
					</Typography>
					<Button
						href={props.url}
						variant="contained"
						color="primary"
						size="small"
						sx={{
							m: "1.5rem 0",
							p: "0.25rem 1rem",
						}}
					>
						Reset your password
					</Button>
					<Typography color={colors.primary[500]}>
						If you didn't request for a password reset, you can safely ignore
						this email.
					</Typography>
					<Typography color={colors.primary[800]} mt="2rem" fontSize="0.8rem">
						This message was sent from Blocdash.com
					</Typography>
				</Box>
			</Box>
		</ThemeProvider>
	);
}
