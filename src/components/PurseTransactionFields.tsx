import { Pressable, Switch, View } from "react-native";
import Badge from "@/components/Basic/Badge";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/stores/ThemeContext";
import {
  COIN_DENOMINATIONS,
  CoinDenomination,
  CoinPurse,
  creditPurse,
  deductFromPurse,
  formatPurseSummary,
  purseToCopper,
} from "@/utils/currency";

export interface QuickAmountOption {
  label: string;
  amount: string;
  currency: CoinDenomination;
  testID?: string;
}

export interface PurseTransactionFieldsProps {
  mode: "deduct" | "credit";
  amountText: string;
  onChangeAmountText: (text: string) => void;
  currency: CoinDenomination;
  onChangeCurrency: (unit: CoinDenomination) => void;
  purse: CoinPurse | null;
  applyToPurse: boolean;
  onChangeApplyToPurse: (value: boolean) => void;
  note: string;
  onChangeNote: (text: string) => void;
  amountPlaceholder?: string;
  notePlaceholder?: string;
  quickAmounts?: readonly QuickAmountOption[];
  testIds?: {
    amountInput?: string;
    unitPrefix?: string;
    toggle?: string;
    dontDeduct?: string;
    useAvailable?: string;
    noteInput?: string;
  };
}

const PurseTransactionFields: React.FC<PurseTransactionFieldsProps> = ({
  mode,
  amountText,
  onChangeAmountText,
  currency,
  onChangeCurrency,
  purse,
  applyToPurse,
  onChangeApplyToPurse,
  note,
  onChangeNote,
  amountPlaceholder,
  notePlaceholder,
  quickAmounts,
  testIds,
}) => {
  const theme = useTheme();
  const { isLargeText } = useLayout();

  const parsedAmount = Math.max(0, Number.parseFloat(amountText) || 0);
  const availableCopper = purse !== null ? purseToCopper(purse) : 0;

  const deduction =
    mode === "deduct" && purse !== null && applyToPurse && parsedAmount > 0
      ? deductFromPurse(purse, parsedAmount, currency)
      : null;

  const creditedPurse =
    mode === "credit" && purse !== null && applyToPurse && parsedAmount > 0
      ? creditPurse(purse, parsedAmount, currency)
      : null;

  const defaultAmountPlaceholder =
    mode === "deduct" ? "Amount paid" : "Amount received";

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={
          isLargeText
            ? { gap: theme.spacing.sm }
            : {
                flexDirection: "row",
                gap: theme.spacing.sm,
                alignItems: "center",
              }
        }
      >
        <View style={isLargeText ? undefined : { flex: 1 }}>
          <Input
            keyboardType="decimal-pad"
            placeholder={amountPlaceholder ?? defaultAmountPlaceholder}
            value={amountText}
            onChangeText={onChangeAmountText}
            testID={testIds?.amountInput}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
          }}
        >
          {COIN_DENOMINATIONS.map((unit) => (
            <Pressable
              key={`purse-unit-${unit}`}
              onPress={() => onChangeCurrency(unit)}
              accessibilityRole="button"
              accessibilityState={{ selected: currency === unit }}
              testID={
                testIds?.unitPrefix !== undefined
                  ? `${testIds.unitPrefix}-${unit}`
                  : undefined
              }
              style={({ pressed }) => ({
                opacity: pressed ? theme.opacity.pressed : 1,
              })}
            >
              <Badge
                text={unit}
                color={currency === unit ? theme.colors.accent : theme.colors.border}
                filled={currency === unit}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {quickAmounts !== undefined && quickAmounts.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
          }}
        >
          {quickAmounts.map((option) => {
            const selected =
              amountText.trim() === option.amount &&
              currency === option.currency;

            return (
              <Pressable
                key={`purse-quick-${option.label}`}
                onPress={() => {
                  onChangeAmountText(option.amount);
                  onChangeCurrency(option.currency);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={option.testID}
                style={({ pressed }) => ({
                  opacity: pressed ? theme.opacity.pressed : 1,
                })}
              >
                <Badge
                  text={option.label}
                  color={theme.colors.accent}
                  filled={selected}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {purse !== null ? (
        <ThemedText
          variant="caption"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          Purse: {formatPurseSummary(purse)}
        </ThemedText>
      ) : null}

      {parsedAmount > 0 ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: applyToPurse }}
          onPress={() => onChangeApplyToPurse(!applyToPurse)}
          testID={testIds?.toggle}
          style={({ pressed }) => ({
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.md,
            opacity: pressed ? theme.opacity.pressed : 1,
          })}
        >
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <ThemedText variant="body">
              {mode === "deduct" ? "Deduct from purse" : "Add to purse"}
            </ThemedText>
            <ThemedText variant="caption">
              {mode === "deduct"
                ? "Turn off if another party member paid"
                : "Turn off if coins go to party loot"}
            </ThemedText>
          </View>
          <Switch
            accessible={false}
            value={applyToPurse}
            onValueChange={onChangeApplyToPurse}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
          />
        </Pressable>
      ) : null}

      {deduction?.status === "change" ? (
        <ThemedText
          variant="caption"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          After purchase: {formatPurseSummary(deduction.nextPurse)}
        </ThemedText>
      ) : null}

      {deduction?.status === "insufficient" ? (
        <View style={{ gap: theme.spacing.xs }}>
          <ThemedText
            variant="caption"
            style={{ color: theme.colors.warning }}
          >
            Exceeds purse ({deduction.availableGold.toFixed(2)} gp available) —
            purse will not be changed
          </ThemedText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.spacing.xs,
            }}
          >
            <Pressable
              onPress={() => onChangeApplyToPurse(false)}
              accessibilityRole="button"
              testID={testIds?.dontDeduct}
              style={({ pressed }) => ({
                opacity: pressed ? theme.opacity.pressed : 1,
              })}
            >
              <Badge
                text="Don't deduct"
                color={theme.colors.accent}
                filled={false}
              />
            </Pressable>
            {availableCopper > 0 ? (
              <Pressable
                onPress={() => {
                  onChangeAmountText(String(availableCopper / 100));
                  onChangeCurrency("gp");
                }}
                accessibilityRole="button"
                testID={testIds?.useAvailable}
                style={({ pressed }) => ({
                  opacity: pressed ? theme.opacity.pressed : 1,
                })}
              >
                <Badge
                  text="Use available"
                  color={theme.colors.accent}
                  filled={false}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {creditedPurse !== null ? (
        <ThemedText
          variant="caption"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          After sale: {formatPurseSummary(creditedPurse)}
        </ThemedText>
      ) : null}

      <Input
        placeholder={notePlaceholder ?? "Note (optional)"}
        value={note}
        onChangeText={onChangeNote}
        testID={testIds?.noteInput}
      />
    </View>
  );
};

export default PurseTransactionFields;
