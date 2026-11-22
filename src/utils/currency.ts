export interface CoinPurse {
  platinum: number;
  gold: number;
  silver: number;
  copper: number;
}

export const calculateTotalGoldValue = (coins: CoinPurse): number =>
  coins.platinum * 10 + coins.gold + coins.silver / 10 + coins.copper / 100;
