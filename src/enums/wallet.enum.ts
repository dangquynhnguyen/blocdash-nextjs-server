export interface WalletCategoryRange {
	min: number;
	max: number | null;
	description: string;
}

export enum WalletCategory {
	PLANKTON = "PLANKTON", // Micro holders
	SHRIMP = "SHRIMP", // Tiny holders
	CRAB = "CRAB", // Small holders
	OCTOPUS = "OCTOPUS", // Active traders
	FISH = "FISH", // Medium holders
	DOLPHIN = "DOLPHIN", // Large holders
	SHARK = "SHARK", // Very large holders
	WHALE = "WHALE", // Major holders
	HUMPBACK = "HUMPBACK", // Largest holders
}

export const WALLET_CATEGORY_RANGES: Record<
	WalletCategory,
	WalletCategoryRange
> = {
	[WalletCategory.PLANKTON]: {
		min: 0,
		max: 1,
		description: "Less than 1 ICP",
	},
	[WalletCategory.SHRIMP]: {
		min: 1,
		max: 10,
		description: "1 - 10 ICP",
	},
	[WalletCategory.CRAB]: {
		min: 10,
		max: 100,
		description: "10 - 100 ICP",
	},
	[WalletCategory.OCTOPUS]: {
		min: 100,
		max: 500,
		description: "100 - 500 ICP",
	},
	[WalletCategory.FISH]: {
		min: 500,
		max: 1_000,
		description: "500 - 1,000 ICP",
	},
	[WalletCategory.DOLPHIN]: {
		min: 1_000,
		max: 5_000,
		description: "1,000 - 5,000 ICP",
	},
	[WalletCategory.SHARK]: {
		min: 5_000,
		max: 10_000,
		description: "5,000 - 10,000 ICP",
	},
	[WalletCategory.WHALE]: {
		min: 10_000,
		max: 100_000,
		description: "10,000 - 100,000 ICP",
	},
	[WalletCategory.HUMPBACK]: {
		min: 100_000,
		max: null,
		description: "More than 100,000 ICP",
	},
};

export function getWalletCategory(balance: number): WalletCategory {
	for (const [category, range] of Object.entries(WALLET_CATEGORY_RANGES)) {
		if (balance >= range.min && (range.max === null || balance < range.max)) {
			return category as WalletCategory;
		}
	}
	return WalletCategory.PLANKTON; // Default for any balance < 1 ICP
}
