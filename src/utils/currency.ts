export interface CoinPurse {
  platinum: number;
  gold: number;
  silver: number;
  copper: number;
}

export type CoinDenomination = "pp" | "gp" | "sp" | "cp";

export const COIN_DENOMINATIONS: readonly CoinDenomination[] = [
  "pp",
  "gp",
  "sp",
  "cp",
];

const DENOMINATION_TO_KEY: Record<CoinDenomination, keyof CoinPurse> = {
  pp: "platinum",
  gp: "gold",
  sp: "silver",
  cp: "copper",
};

const DENOMINATION_TO_COPPER: Record<CoinDenomination, number> = {
  pp: 1000,
  gp: 100,
  sp: 10,
  cp: 1,
};

export const calculateTotalGoldValue = (coins: CoinPurse): number =>
  coins.platinum * 10 + coins.gold + coins.silver / 10 + coins.copper / 100;

export const purseToCopper = (coins: CoinPurse): number =>
  coins.platinum * 1000 +
  coins.gold * 100 +
  coins.silver * 10 +
  coins.copper;

export const amountToCopper = (
  amount: number,
  denomination: CoinDenomination,
): number => Math.round(Math.max(0, amount) * DENOMINATION_TO_COPPER[denomination]);

export type PurseDeductionResult =
  | { status: "exact"; nextPurse: CoinPurse }
  | { status: "change"; nextPurse: CoinPurse }
  | { status: "insufficient"; availableGold: number };

export const deductFromPurse = (
  purse: CoinPurse,
  amount: number,
  denomination: CoinDenomination,
): PurseDeductionResult => {
  const key = DENOMINATION_TO_KEY[denomination];
  const costCp = amountToCopper(amount, denomination);

  if (costCp <= 0) {
    return { status: "exact", nextPurse: { ...purse } };
  }

  if (Number.isInteger(amount) && purse[key] >= amount) {
    return {
      status: "exact",
      nextPurse: {
        ...purse,
        [key]: purse[key] - amount,
      },
    };
  }

  const totalCp = purseToCopper(purse);
  if (totalCp < costCp) {
    return {
      status: "insufficient",
      availableGold: totalCp / 100,
    };
  }

  // Convert remaining copper back into minimal change, preserving platinum
  // only when the remaining balance exceeds existing platinum-equivalent.
  const remainingCp = totalCp - costCp;
  const platinum = Math.min(purse.platinum, Math.floor(remainingCp / 1000));
  const afterPlatinum = remainingCp - platinum * 1000;
  const gold = Math.floor(afterPlatinum / 100);
  const afterGold = afterPlatinum - gold * 100;
  const silver = Math.floor(afterGold / 10);
  const copper = afterGold - silver * 10;

  return {
    status: "change",
    nextPurse: { platinum, gold, silver, copper },
  };
};

export const formatPurseSummary = (purse: CoinPurse): string => {
  const parts: string[] = [];
  if (purse.platinum > 0) parts.push(`${purse.platinum} pp`);
  if (purse.gold > 0) parts.push(`${purse.gold} gp`);
  if (purse.silver > 0) parts.push(`${purse.silver} sp`);
  if (purse.copper > 0) parts.push(`${purse.copper} cp`);
  return parts.length > 0 ? parts.join(", ") : "0 gp";
};
