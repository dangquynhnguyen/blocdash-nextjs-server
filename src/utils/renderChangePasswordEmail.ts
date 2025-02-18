import React from "react";
import ReactDOMServer from "react-dom/server";
import ChangePassword from "../mailComponents/ChangePassword";

export const renderChangePasswordEmail = (to: string, url: string) => {
	const element = React.createElement(ChangePassword, { to, url });
	return ReactDOMServer.renderToString(element);
};
