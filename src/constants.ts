export const COOKIE_NAME = "blocdash-cookie";
export const RESET_PASSWORD_TOKEN_EXPIRES = 60 * 5; // 5 minutes
export const __prod__ = process.env.NODE_ENV === "production";
export const LEDGER_API_URL = `https://ledger-api.internetcomputer.org/transactions?limit=${1000}`;
