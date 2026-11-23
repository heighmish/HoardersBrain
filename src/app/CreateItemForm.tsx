import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { RarityArray } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  createItem,
  ItemAcquisition,
  updateItemDetails,
} from "@/db/repositories";
import { Item } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterContainers } from "@/hooks/useCharacterContainers";
import { useCharacterTags } from "@/hooks/useCharacterTags";
import { useItem } from "@/hooks/useItem";
import { useItemTagLinks } from "@/hooks/useItemTagLinks";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import {
  COIN_DENOMINATIONS,
  CoinDenomination,
  deductFromPurse,
  formatPurseSummary,
  purseToCopper,
} from "@/utils/currency";
import { parseIdParam } from "@/utils/params";
import { AntDesign } from "@expo/vector-icons";
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

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
};

const CreateItemForm = () => {
  const theme = useTheme();
  const character = useSelectedCharacter();
  const { storageId, itemId } = useLocalSearchParams<{
    storageId?: string;
    itemId?: string;
  }>();

  const editItemId = parseIdParam(itemId);
  const createStorageId = parseIdParam(storageId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={editItemId !== null ? "Edit item" : "New item"} />
      {editItemId !== null ? (
        <EditItemFormLoader itemId={editItemId} />
      ) : (
        <ItemFormBody
          mode="create"
          storageId={createStorageId ?? undefined}
          initialInput={{
            name: "",
            description: null,
            rarity: "Common",
            character_id: character.id,
            properties: null,
            quantity: 1,
            item_type: "consumable",
          }}
          initialWeightText="1"
          initialQuantityText="1"
          initialValueText=""
          initialValueCurrency="gp"
          initialTagIds={[]}
        />
      )}
    </View>
  );
};

const EditItemFormLoader = ({ itemId }: { itemId: number }) => {
  const item = useItem(itemId);
  const tagLinks = useItemTagLinks(itemId);

  if (item.status === "error" || tagLinks.error) {
    return (
      <ScreenState
        kind="message"
        message="Failed to load item"
        actionLabel="Back"
        onAction={goBack}
      />
    );
  }

  if (item.status === "loading" || !tagLinks.isReady) {
    return <ScreenState kind="loading" />;
  }

  if (item.status === "missing") {
    return (
      <ScreenState
        kind="message"
        message="Item not found"
        actionLabel="Back"
        onAction={goBack}
      />
    );
  }

  const loaded = item.data;

  return (
    <ItemFormBody
      key={loaded.item_id}
      mode="edit"
      itemId={loaded.item_id}
      initialInput={{
        name: loaded.name,
        description: loaded.description,
        rarity: loaded.rarity,
        character_id: loaded.character_id,
        properties: loaded.properties,
        quantity: loaded.quantity,
        item_type: loaded.item_type,
      }}
      initialWeightText={String(loaded.weight)}
      initialQuantityText={String(loaded.quantity)}
      initialValueText={loaded.value === null ? "" : String(loaded.value)}
      initialValueCurrency={loaded.value_currency ?? "gp"}
      initialTagIds={tagLinks.tagIds}
    />
  );
};

type ItemFormBodyProps = (
  | { mode: "create"; storageId?: number }
  | { mode: "edit"; itemId: number }
) & {
  initialInput: ItemInput;
  initialWeightText: string;
  initialQuantityText: string;
  initialValueText: string;
  initialValueCurrency: CoinDenomination;
  initialTagIds: number[];
};

const ItemFormBody = (props: ItemFormBodyProps) => {
  const theme = useTheme();
  const db = useDatabase();

  const {
    mode,
    initialInput,
    initialWeightText,
    initialQuantityText,
    initialValueText,
    initialValueCurrency,
    initialTagIds,
  } = props;

  const [itemInput, setItemInput] = useState<ItemInput>(initialInput);
  const [weightText, setWeightText] = useState(initialWeightText);
  const [quantityText, setQuantityText] = useState(initialQuantityText);
  const [valueText, setValueText] = useState(initialValueText);
  const [valueCurrency, setValueCurrency] =
    useState<CoinDenomination>(initialValueCurrency);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(initialTagIds);
  const [selectedContainerId, setSelectedContainerId] = useState<number | null>(
    props.mode === "create" && props.storageId !== undefined
      ? props.storageId
      : null,
  );
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  // Acquisition state (create mode only)
  const [acquisitionKind, setAcquisitionKind] =
    useState<AcquisitionChoice>("none");
  const [paidAmountText, setPaidAmountText] = useState("");
  const [paidCurrency, setPaidCurrency] = useState<CoinDenomination>("gp");
  const [shouldDeductFromPurse, setShouldDeductFromPurse] = useState(true);
  const [acquisitionNote, setAcquisitionNote] = useState("");

  const action = useAsyncAction({ keepBusyOnSuccess: true });

  const characterQuery = useCharacter(initialInput.character_id);
  const allTags = useCharacterTags(initialInput.character_id);
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

  const containers = useCharacterContainers(initialInput.character_id);
  const containerList = containers.data;

  const defaultContainerId =
    mode === "create" && selectedContainerId === null
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

  const parsedPaidAmount = Math.max(0, parseFloat(paidAmountText) || 0);
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
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const adjustQuantity = (delta: number) => {
    const current = Number.parseInt(quantityText, 10) || 1;
    setQuantityText(String(Math.max(1, current + delta)));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const parseOptionalValue = (): {
    value: number | null;
    value_currency: CoinDenomination | null;
  } => {
    const trimmed = valueText.trim();
    if (trimmed.length === 0) {
      return { value: null, value_currency: null };
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
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
    if (trimmedName.length === 0) {
      return;
    }

    const quantity = Math.max(1, Number.parseInt(quantityText, 10) || 1);
    const weight = Math.max(0, parseFloat(weightText) || 0);
    const { value, value_currency } = parseOptionalValue();

    if (props.mode === "create") {
      if (containerId === null) {
        return;
      }
      const targetContainerId = containerId;
      const acquisition = buildAcquisition();
      void action.run(async () => {
        await createItem(
          db,
          {
            ...itemInput,
            name: trimmedName,
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
      return;
    }

    const editItemId = props.itemId;
    void action.run(async () => {
      await updateItemDetails(
        db,
        editItemId,
        {
          name: trimmedName,
          description: itemInput.description,
          item_type: itemInput.item_type,
          weight,
          rarity: itemInput.rarity,
          quantity,
          value,
          value_currency,
          properties: itemInput.properties,
        },
        visibleSelectedTagIds,
      );
      router.back();
    }, "Failed to save item.");
  };

  const sectionLabel = (label: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {label}
    </ThemedText>
  );

  const divider = (
    <View style={{ height: 1, backgroundColor: theme.colors.border }} />
  );

  const disclosureRow = (
    label: string,
    summary: string,
    highlighted: boolean,
    isOpen: boolean,
    onPress: () => void,
    testID: string,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
        gap: theme.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
          flexShrink: 1,
        }}
      >
        <ThemedText
          variant="subhead"
          numberOfLines={1}
          style={{
            color: highlighted ? theme.colors.accent : theme.colors.textMuted,
          }}
        >
          {summary}
        </ThemedText>
        <AntDesign
          name={isOpen ? "up" : "down"}
          size={12}
          color={theme.colors.textMuted}
        />
      </View>
    </Pressable>
  );

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
            {sectionLabel("Quantity")}
            <NumericInput
              keyboardType="number-pad"
              value={quantityText}
              testID="item-quantity-input"
              onChangeText={setQuantityText}
              buttonDecrement={() => adjustQuantity(-1)}
              buttonIncrement={() => adjustQuantity(1)}
            />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            {sectionLabel("Weight")}
            <NumericInput
              value={weightText}
              testID="item-weight-input"
              onChangeText={setWeightText}
              buttonDecrement={() => adjustWeight(-0.5)}
              buttonIncrement={() => adjustWeight(0.5)}
            />
          </View>
        </View>

        {props.mode === "create" ? (
          <View style={{ gap: theme.spacing.xs }}>
            {sectionLabel("Container")}
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
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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
        ) : null}

        <View style={{ gap: theme.spacing.xs }}>
          {sectionLabel("Tags")}
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
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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
          {sectionLabel("Optional details")}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {disclosureRow(
              "Value",
              valueSummary,
              valueText.trim().length > 0,
              expanded === "value",
              () => toggleSection("value"),
              "item-value-row",
            )}
            {expanded === "value" ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingBottom: theme.spacing.md,
                  flexDirection: "row",
                  gap: theme.spacing.sm,
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Input
                    keyboardType="decimal-pad"
                    placeholder="Value"
                    value={valueText}
                    onChangeText={setValueText}
                    testID="item-value-input"
                  />
                </View>
                <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                  {COIN_DENOMINATIONS.map((unit) => (
                    <Pressable
                      key={`item-value-unit-${unit}`}
                      onPress={() => setValueCurrency(unit)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: valueCurrency === unit }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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

            {props.mode === "create" ? (
              <>
                {divider}
                {disclosureRow(
                  "Acquisition",
                  acquisitionSummary,
                  acquisitionKind !== "none",
                  expanded === "acquisition",
                  () => toggleSection("acquisition"),
                  "item-acquisition-row",
                )}
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
                            opacity: pressed ? 0.7 : 1,
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
                          style={{
                            flexDirection: "row",
                            gap: theme.spacing.sm,
                            alignItems: "center",
                          }}
                        >
                          <View style={{ flex: 1 }}>
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
                                  opacity: pressed ? 0.7 : 1,
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
                              opacity: pressed ? 0.7 : 1,
                            })}
                            accessibilityRole="switch"
                            accessibilityState={{
                              checked: shouldDeductFromPurse,
                            }}
                            onPress={() =>
                              setShouldDeductFromPurse((prev) => !prev)
                            }
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
                              value={shouldDeductFromPurse}
                              onValueChange={setShouldDeductFromPurse}
                              trackColor={{
                                false: theme.colors.border,
                                true: theme.colors.accent,
                              }}
                              testID="item-deduct-purse-toggle"
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
                                  opacity: pressed ? 0.7 : 1,
                                })}
                                testID="item-dont-deduct-button"
                              >
                                <Badge
                                  text="Don't deduct"
                                  color={theme.colors.accent}
                                  filled={false}
                                />
                              </Pressable>
                              {purse !== null && purseToCopper(purse) > 0 ? (
                                <Pressable
                                  onPress={() => {
                                    const totalGp = purseToCopper(purse) / 100;
                                    setPaidAmountText(String(totalGp));
                                    setPaidCurrency("gp");
                                  }}
                                  accessibilityRole="button"
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.7 : 1,
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
              </>
            ) : null}

            {divider}
            {disclosureRow(
              "Rarity",
              itemInput.rarity,
              itemInput.rarity !== "Common",
              expanded === "rarity",
              () => toggleSection("rarity"),
              "item-rarity-row",
            )}
            {expanded === "rarity" ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingBottom: theme.spacing.md,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.xs,
                }}
              >
                {RarityArray.map((rarity) => (
                  <Pressable
                    onPress={() => {
                      setItemInput((prev) => ({ ...prev, rarity }));
                    }}
                    key={`create-item-rarity-${rarity}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: itemInput.rarity === rarity }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    testID={`item-rarity-${rarity}`}
                  >
                    <Badge
                      text={rarity}
                      color={rarityColors[rarity]}
                      filled={itemInput.rarity === rarity}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {action.error !== null ? (
          <ThemedText variant="caption" style={{ color: theme.colors.error }}>
            {action.error}
          </ThemedText>
        ) : null}

        <Button
          title={mode === "edit" ? "Save" : "Create"}
          onPress={submit}
          loading={action.submitting}
          disabled={
            action.submitting ||
            itemInput.name.trim().length === 0 ||
            (mode === "create" && containerId === null)
          }
          testID={mode === "edit" ? "save-item-button" : "create-item-button"}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
