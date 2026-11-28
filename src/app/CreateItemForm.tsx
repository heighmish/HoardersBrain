import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import {
  CardDivider,
  DisclosureCard,
  DisclosureRow,
  SectionLabel,
} from "@/components/Basic/DisclosureSection";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import RarityPicker from "@/components/RarityPicker";
import { useDatabase } from "@/db/DatabaseProvider";
import { createItem, ItemAcquisition } from "@/db/repositories";
import { Item } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterContainers } from "@/hooks/useCharacterContainers";
import { useCharacterTags } from "@/hooks/useCharacterTags";
import { useLayout } from "@/hooks/useLayout";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import {
  COIN_DENOMINATIONS,
  CoinDenomination,
  deductFromPurse,
  formatPurseSummary,
  purseToCopper,
} from "@/utils/currency";
import {
  formatDecimal,
  NonNegativeNumber,
  parseClampedPositiveInt,
  parseNonNegative,
  parseOptionalNonNegative,
  stepDecimalText,
  stepIntText,
  ZERO,
} from "@/utils/numbers";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";

type ItemInput = Omit<
  Item,
  | "item_id"
  | "storage_location_id"
  | "weight"
  | "value"
  | "value_currency"
  | "deleted_at"
>;

type AcquisitionChoice = "none" | "looted" | "found" | "bought";

type ExpandedSection = "value" | "acquisition" | "rarity" | null;

const ACQUISITION_OPTIONS: readonly {
  id: AcquisitionChoice;
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "looted", label: "Looted" },
  { id: "found", label: "Found" },
  { id: "bought", label: "Bought" },
];

const CreateItemForm = () => {
  const theme = useTheme();
  const character = useSelectedCharacter();
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="New item" />
      <ItemFormBody
        key={character.id}
        characterId={character.id}
        storageId={parseIdParam(storageId) ?? undefined}
      />
    </View>
  );
};

interface ItemFormBodyProps {
  characterId: number;
  storageId?: number;
}

const ItemFormBody = ({ characterId, storageId }: ItemFormBodyProps) => {
  const theme = useTheme();
  const { isLargeText } = useLayout();
  const db = useDatabase();

  const [itemInput, setItemInput] = useState<ItemInput>({
    name: "",
    description: null,
    rarity: "Common",
    character_id: characterId,
    properties: null,
    quantity: 1,
  });
  const [weightText, setWeightText] = useState("1");
  const [quantityText, setQuantityText] = useState("1");
  const [valueText, setValueText] = useState("");
  const [valueCurrency, setValueCurrency] = useState<CoinDenomination>("gp");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<number | null>(
    storageId ?? null,
  );
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const [acquisitionKind, setAcquisitionKind] =
    useState<AcquisitionChoice>("none");
  const [paidAmountText, setPaidAmountText] = useState("");
  const [paidCurrency, setPaidCurrency] = useState<CoinDenomination>("gp");
  const [shouldDeductFromPurse, setShouldDeductFromPurse] = useState(true);
  const [acquisitionNote, setAcquisitionNote] = useState("");

  const action = useAsyncAction({ keepBusyOnSuccess: true });

  const characterQuery = useCharacter(characterId);
  const weightTracking =
    characterQuery.status === "ready"
      ? characterQuery.data.weight_tracking
      : true;

  const allTags = useCharacterTags(characterId);
  const activeTagIds = new Set(allTags.map((tag) => tag.tag_id));
  const visibleSelectedTagIds = selectedTagIds.filter((id) =>
    activeTagIds.has(id),
  );
  const childrenByParent = new Map<number, typeof allTags>();
  for (const tag of allTags) {
    if (tag.parent_tag_id !== null && activeTagIds.has(tag.parent_tag_id)) {
      const existing = childrenByParent.get(tag.parent_tag_id) ?? [];
      existing.push(tag);
      childrenByParent.set(tag.parent_tag_id, existing);
    }
  }

  const containers = useCharacterContainers(characterId);
  const containerList = containers.data;

  const defaultContainerId =
    selectedContainerId === null
      ? (containerList.find((entry) => entry.carrying) ?? containerList[0])
          ?.storage_location_id ?? null
      : null;
  const containerId = selectedContainerId ?? defaultContainerId;

  const purse =
    characterQuery.status === "ready"
      ? {
          platinum: characterQuery.data.platinum,
          gold: characterQuery.data.gold,
          silver: characterQuery.data.silver,
          copper: characterQuery.data.copper,
        }
      : null;

  const parsedPaidAmount = parseNonNegative(paidAmountText);
  const availableCopper = purse !== null ? purseToCopper(purse) : 0;
  const deductionPreview =
    acquisitionKind === "bought" &&
    shouldDeductFromPurse &&
    parsedPaidAmount > 0 &&
    purse !== null
      ? deductFromPurse(purse, parsedPaidAmount, paidCurrency)
      : null;

  const toggleSection = (section: Exclude<ExpandedSection, null>) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const adjustWeight = (delta: number) => {
    setWeightText((current) => stepDecimalText(current, delta));
  };

  const adjustQuantity = (delta: number) => {
    setQuantityText((current) => stepIntText(current, delta, { min: 1 }));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const parseOptionalValue = (): {
    value: NonNegativeNumber | null;
    value_currency: CoinDenomination | null;
  } => {
    const parsed = parseOptionalNonNegative(valueText);
    if (parsed === null) {
      return { value: null, value_currency: null };
    }
    return { value: parsed, value_currency: valueCurrency };
  };

  const buildAcquisition = (): ItemAcquisition | undefined => {
    if (acquisitionKind === "none") {
      return undefined;
    }
    const trimmedNote = acquisitionNote.trim();
    const note = trimmedNote.length > 0 ? trimmedNote : undefined;
    if (acquisitionKind === "looted" || acquisitionKind === "found") {
      return { kind: acquisitionKind, note };
    }
    return {
      kind: "bought",
      amount: parsedPaidAmount,
      denomination: paidCurrency,
      deductFromPurse: shouldDeductFromPurse && parsedPaidAmount > 0,
      note,
    };
  };

  const submit = () => {
    const trimmedName = itemInput.name.trim();
    if (trimmedName.length === 0 || containerId === null) {
      return;
    }

    const quantity = parseClampedPositiveInt(quantityText);
    const weight = weightTracking ? parseNonNegative(weightText) : ZERO;
    const { value, value_currency } = parseOptionalValue();
    const trimmedDescription = itemInput.description?.trim() ?? "";
    const acquisition = buildAcquisition();
    const targetContainerId = containerId;

    void action.run(async () => {
      await createItem(
        db,
        {
          ...itemInput,
          name: trimmedName,
          description: trimmedDescription.length > 0 ? trimmedDescription : null,
          quantity,
          storage_location_id: targetContainerId,
          weight,
          value,
          value_currency,
        },
        visibleSelectedTagIds,
        acquisition,
      );
      router.back();
    }, "Failed to save item.");
  };

  const valueSummary =
    valueText.trim().length > 0 ? `${valueText.trim()} ${valueCurrency}` : "Add";
  const acquisitionSummary =
    ACQUISITION_OPTIONS.find((option) => option.id === acquisitionKind)
      ?.label ?? "None";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Input
            placeholder="Name"
            value={itemInput.name}
            testID="item-name-input"
            onChangeText={(text) =>
              setItemInput((prev) => ({ ...prev, name: text }))
            }
          />
          <Input
            placeholder="Description"
            value={itemInput.description ?? ""}
            testID="item-description-input"
            onChangeText={(text) =>
              setItemInput((prev) => ({ ...prev, description: text }))
            }
          />
        </View>

        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <SectionLabel label="Quantity" />
            <NumericInput
              keyboardType="number-pad"
              value={quantityText}
              testID="item-quantity-input"
              onChangeText={setQuantityText}
              buttonDecrement={() => adjustQuantity(-1)}
              buttonIncrement={() => adjustQuantity(1)}
            />
          </View>
          {weightTracking ? (
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <SectionLabel label="Weight" />
              <NumericInput
                value={weightText}
                testID="item-weight-input"
                onChangeText={setWeightText}
                buttonDecrement={() => adjustWeight(-0.5)}
                buttonIncrement={() => adjustWeight(0.5)}
              />
            </View>
          ) : null}
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <SectionLabel label="Container" />
          {containerList.length === 0 ? (
            <ThemedText variant="subhead">No containers</ThemedText>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: theme.spacing.xs,
              }}
            >
              {containerList.map((container) => (
                <Pressable
                  onPress={() =>
                    setSelectedContainerId(container.storage_location_id)
                  }
                  key={`item-container-${container.storage_location_id}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: containerId === container.storage_location_id,
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? theme.opacity.pressed : 1,
                  })}
                  testID={`item-container-${container.storage_location_id}`}
                >
                  <Badge
                    text={container.name}
                    color={
                      containerId === container.storage_location_id
                        ? theme.colors.accent
                        : theme.colors.border
                    }
                    filled={containerId === container.storage_location_id}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <SectionLabel label="Tags" />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.spacing.xs,
            }}
          >
            {allTags.map((tag) => {
              const children = childrenByParent.get(tag.tag_id) ?? [];
              const childSelected = children.some((child) =>
                visibleSelectedTagIds.includes(child.tag_id),
              );
              const selected = visibleSelectedTagIds.includes(tag.tag_id);

              return (
                <Pressable
                  key={`item-tag-${tag.tag_id}`}
                  onPress={() => toggleTag(tag.tag_id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected || childSelected }}
                  style={({ pressed }) => ({
                    opacity: pressed ? theme.opacity.pressed : 1,
                  })}
                  testID={`item-tag-${tag.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Badge
                    text={tag.name}
                    color={
                      selected || childSelected
                        ? theme.colors.accent
                        : theme.colors.border
                    }
                    filled={selected}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <SectionLabel label="Optional details" />
          <DisclosureCard>
            <DisclosureRow
              label="Value"
              summary={valueSummary}
              highlighted={valueText.trim().length > 0}
              isOpen={expanded === "value"}
              onPress={() => toggleSection("value")}
              testID="item-value-row"
            />
            {expanded === "value" ? (
              <View
                style={
                  isLargeText
                    ? {
                        paddingHorizontal: theme.spacing.md,
                        paddingBottom: theme.spacing.md,
                        gap: theme.spacing.sm,
                      }
                    : {
                        paddingHorizontal: theme.spacing.md,
                        paddingBottom: theme.spacing.md,
                        flexDirection: "row",
                        gap: theme.spacing.sm,
                        alignItems: "center",
                      }
                }
              >
                <View style={isLargeText ? undefined : { flex: 1 }}>
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Value"
                    value={valueText}
                    onChangeText={setValueText}
                    testID="item-value-input"
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
                      key={`item-value-unit-${unit}`}
                      onPress={() => setValueCurrency(unit)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: valueCurrency === unit }}
                      style={({ pressed }) => ({
                        opacity: pressed ? theme.opacity.pressed : 1,
                      })}
                      testID={`item-value-unit-${unit}`}
                    >
                      <Badge
                        text={unit}
                        color={
                          valueCurrency === unit
                            ? theme.colors.accent
                            : theme.colors.border
                        }
                        filled={valueCurrency === unit}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <CardDivider />
            <DisclosureRow
              label="Acquisition"
              summary={acquisitionSummary}
              highlighted={acquisitionKind !== "none"}
              isOpen={expanded === "acquisition"}
              onPress={() => toggleSection("acquisition")}
              testID="item-acquisition-row"
            />
            {expanded === "acquisition" ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingBottom: theme.spacing.md,
                  gap: theme.spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                  }}
                >
                  {ACQUISITION_OPTIONS.map((option) => (
                    <Pressable
                      key={`acquisition-${option.id}`}
                      onPress={() => {
                        setAcquisitionKind(option.id);
                        if (
                          option.id === "bought" &&
                          paidAmountText.trim().length === 0 &&
                          valueText.trim().length > 0
                        ) {
                          setPaidAmountText(valueText.trim());
                          setPaidCurrency(valueCurrency);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: acquisitionKind === option.id,
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? theme.opacity.pressed : 1,
                      })}
                      testID={`item-acquisition-${option.id}`}
                    >
                      <Badge
                        text={option.label}
                        color={
                          acquisitionKind === option.id
                            ? theme.colors.accent
                            : theme.colors.border
                        }
                        filled={acquisitionKind === option.id}
                      />
                    </Pressable>
                  ))}
                </View>

                {acquisitionKind === "bought" ? (
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
                          placeholder="Amount paid"
                          value={paidAmountText}
                          onChangeText={setPaidAmountText}
                          testID="item-paid-amount-input"
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
                            key={`item-paid-unit-${unit}`}
                            onPress={() => setPaidCurrency(unit)}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: paidCurrency === unit,
                            }}
                            style={({ pressed }) => ({
                              opacity: pressed ? theme.opacity.pressed : 1,
                            })}
                            testID={`item-paid-unit-${unit}`}
                          >
                            <Badge
                              text={unit}
                              color={
                                paidCurrency === unit
                                  ? theme.colors.accent
                                  : theme.colors.border
                              }
                              filled={paidCurrency === unit}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {purse !== null ? (
                      <ThemedText
                        variant="caption"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        Purse: {formatPurseSummary(purse)}
                      </ThemedText>
                    ) : null}

                    {parsedPaidAmount > 0 ? (
                      <Pressable
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: theme.spacing.md,
                          opacity: pressed ? theme.opacity.pressed : 1,
                        })}
                        accessibilityRole="switch"
                        accessibilityState={{
                          checked: shouldDeductFromPurse,
                        }}
                        onPress={() =>
                          setShouldDeductFromPurse((prev) => !prev)
                        }
                        testID="item-deduct-purse-toggle"
                      >
                        <View style={{ flex: 1, gap: theme.spacing.xs }}>
                          <ThemedText variant="body">
                            Deduct from purse
                          </ThemedText>
                          <ThemedText variant="caption">
                            Turn off if another party member paid
                          </ThemedText>
                        </View>
                        <Switch
                          accessible={false}
                          value={shouldDeductFromPurse}
                          onValueChange={setShouldDeductFromPurse}
                          trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.accent,
                          }}
                        />
                      </Pressable>
                    ) : null}

                    {deductionPreview?.status === "change" ? (
                      <ThemedText
                        variant="caption"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        After purchase:{" "}
                        {formatPurseSummary(deductionPreview.nextPurse)}
                      </ThemedText>
                    ) : null}

                    {deductionPreview?.status === "insufficient" ? (
                      <View style={{ gap: theme.spacing.xs }}>
                        <ThemedText
                          variant="caption"
                          style={{ color: theme.colors.warning }}
                        >
                          Exceeds purse (
                          {deductionPreview.availableGold.toFixed(2)} gp
                          available) — purse will not be changed
                        </ThemedText>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: theme.spacing.xs,
                          }}
                        >
                          <Pressable
                            onPress={() => setShouldDeductFromPurse(false)}
                            accessibilityRole="button"
                            style={({ pressed }) => ({
                              opacity: pressed ? theme.opacity.pressed : 1,
                            })}
                            testID="item-dont-deduct-button"
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
                                setPaidAmountText(
                                  formatDecimal(availableCopper / 100),
                                );
                                setPaidCurrency("gp");
                              }}
                              accessibilityRole="button"
                              style={({ pressed }) => ({
                                opacity: pressed ? theme.opacity.pressed : 1,
                              })}
                              testID="item-use-available-button"
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

                    <Input
                      placeholder="Note (optional)"
                      value={acquisitionNote}
                      onChangeText={setAcquisitionNote}
                      testID="item-acquisition-note-input"
                    />
                  </View>
                ) : null}

                {acquisitionKind === "looted" ||
                acquisitionKind === "found" ? (
                  <Input
                    placeholder="Source (optional)"
                    value={acquisitionNote}
                    onChangeText={setAcquisitionNote}
                    testID="item-acquisition-note-input"
                  />
                ) : null}
              </View>
            ) : null}

            <CardDivider />
            <DisclosureRow
              label="Rarity"
              summary={itemInput.rarity}
              highlighted={itemInput.rarity !== "Common"}
              isOpen={expanded === "rarity"}
              onPress={() => toggleSection("rarity")}
              testID="item-rarity-row"
            />
            {expanded === "rarity" ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingBottom: theme.spacing.md,
                }}
              >
                <RarityPicker
                  value={itemInput.rarity}
                  onChange={(rarity) =>
                    setItemInput((prev) => ({ ...prev, rarity }))
                  }
                  testIdPrefix="item-rarity"
                />
              </View>
            ) : null}
          </DisclosureCard>
        </View>

        {action.error !== null ? (
          <ThemedText variant="caption" style={{ color: theme.colors.error }}>
            {action.error}
          </ThemedText>
        ) : null}

        <Button
          title="Create"
          onPress={submit}
          loading={action.submitting}
          disabled={
            action.submitting ||
            itemInput.name.trim().length === 0 ||
            containerId === null
          }
          testID="create-item-button"
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
