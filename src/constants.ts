export const COOKIE_NAME = "blocdash-cookie";
export const RESET_PASSWORD_TOKEN_EXPIRES = 60 * 5; // 5 minutes
export const __prod__ = process.env.NODE_ENV === "production";
const TRANSACTIONS_LIMIT = 1000;
export const URL_LEDGER_API_TRANSACTIONS_V1 = `https://ledger-api.internetcomputer.org/transactions?limit=${TRANSACTIONS_LIMIT}`;
export const URL_LEDGER_API_TRANSACTIONS_V2 = `https://ledger-api.internetcomputer.org/v2/transactions?limit=${TRANSACTIONS_LIMIT}`;
