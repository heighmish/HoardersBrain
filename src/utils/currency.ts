import { formatDecimal, NonNegativeNumber } from "@/utils/numbers";

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
  coins.platinum * 1000 + coins.gold * 100 + coins.silver * 10 + coins.copper;

export const amountToCopper = (
  amount: NonNegativeNumber,
  denomination: CoinDenomination,
): number => Math.round(amount * DENOMINATION_TO_COPPER[denomination]);

export type PurseDeductionResult =
  | { status: "exact"; nextPurse: CoinPurse }
  | { status: "change"; nextPurse: CoinPurse }
  | { status: "insufficient"; availableGold: number };

export const deductFromPurse = (
  purse: CoinPurse,
  amount: NonNegativeNumber,
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

export const creditPurse = (
  purse: CoinPurse,
  amount: NonNegativeNumber,
  denomination: CoinDenomination,
): CoinPurse => {
  if (amount <= 0) {
    return { ...purse };
  }

  if (Number.isInteger(amount)) {
    const key = DENOMINATION_TO_KEY[denomination];
    return { ...purse, [key]: purse[key] + amount };
  }

  const addCp = amountToCopper(amount, denomination);
  if (addCp <= 0) {
    return { ...purse };
  }

  const next = { ...purse };
  let remainingCp = addCp;

  // Break fractional amounts down into smaller denominations without minting
  // coins higher than the denomination being credited.
  if (denomination === "pp") {
    const platinum = Math.floor(remainingCp / 1000);
    next.platinum += platinum;
    remainingCp -= platinum * 1000;
  }

  if (denomination === "pp" || denomination === "gp") {
    const gold = Math.floor(remainingCp / 100);
    next.gold += gold;
    remainingCp -= gold * 100;
  }

  if (denomination !== "cp") {
    const silver = Math.floor(remainingCp / 10);
    next.silver += silver;
    remainingCp -= silver * 10;
  }

  next.copper += remainingCp;

  return next;
};

export const formatCoinAmount = (
  amount: NonNegativeNumber,
  denomination: CoinDenomination,
): string => `${formatDecimal(amount)} ${denomination}`;

const formatPurseParts = (
  purse: CoinPurse,
  units: readonly [string, string, string, string],
  separator: string,
  emptyFallback: string,
): string => {
  const entries: readonly [number, string][] = [
    [purse.platinum, units[0]],
    [purse.gold, units[1]],
    [purse.silver, units[2]],
    [purse.copper, units[3]],
  ];
  const parts = entries.flatMap(([amount, unit]) =>
    amount > 0 ? [`${amount}${unit}`] : [],
  );
  return parts.length > 0 ? parts.join(separator) : emptyFallback;
};

export const formatPurseSummary = (purse: CoinPurse): string =>
  formatPurseParts(purse, [" pp", " gp", " sp", " cp"], ", ", "0 gp");

export const formatCompactPurse = (purse: CoinPurse): string =>
  formatPurseParts(purse, ["p", "g", "s", "c"], " · ", "0g");
