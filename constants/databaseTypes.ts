export type Rarity = "Common" | "Uncommon" | "Rare" | "Very Rare" | "Legendary";

export const RarityArray = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
] as const satisfies readonly Rarity[];
