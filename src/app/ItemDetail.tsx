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
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import PurseTransactionFields, {
  QuickAmountOption,
} from "@/components/PurseTransactionFields";
import RarityPicker from "@/components/RarityPicker";
import { Rarity } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  deleteItemRow,
  moveItemToContainer,
  removeItemsFromStack,
  splitItemStack,
  transferItemToCharacter,
  updateItemDetails,
  useOneFromItem,
} from "@/db/repositories";
import { Item } from "@/db/schema";
import { useActiveCharacters } from "@/hooks/useActiveCharacters";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterContainers } from "@/hooks/useCharacterContainers";
import { useCharacterTags } from "@/hooks/useCharacterTags";
import { useItem } from "@/hooks/useItem";
import { useItemTagLinks } from "@/hooks/useItemTagLinks";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/stores/ThemeContext";
import {
  COIN_DENOMINATIONS,
  CoinDenomination,
  CoinPurse,
  formatCoinAmount,
} from "@/utils/currency";
import { formatWeight } from "@/utils/encumbrance";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ExpandedSection =
  "container" | "tags" | "value" | "rarity" | "remove" | null;

type MoveMode = "all" | "split";

type RemoveKind = "sell" | "drop" | "transfer" | "delete";

interface DetailState {
  name: string;
  description: string;
  quantityText: string;
  weightText: string;
  valueText: string;
  valueCurrency: CoinDenomination;
  rarity: Rarity;
  selectedTagIds: number[];
  syncedItemQty: number;
  expanded: ExpandedSection;
  moveMode: MoveMode;
  splitAmountText: string;
  splitDestinationId: number | null;
  removeKind: RemoveKind;
  sellQtyText: string;
  sellAmountText: string;
  sellCurrency: CoinDenomination;
  addToPurse: boolean;
  sellNote: string;
  dropQtyText: string;
  dropNote: string;
  transferTargetId: number | null;
}

type DetailAction =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_DESCRIPTION"; value: string }
  | { type: "SET_QUANTITY_TEXT"; value: string }
  | { type: "SET_WEIGHT_TEXT"; value: string }
  | { type: "SET_VALUE_TEXT"; value: string }
  | { type: "SET_VALUE_CURRENCY"; value: CoinDenomination }
  | { type: "SET_RARITY"; value: Rarity }
  | { type: "TOGGLE_TAG"; tagId: number }
  | { type: "SYNC_LIVE_QUANTITY"; quantity: number }
  | { type: "SET_EXPANDED"; value: ExpandedSection }
  | { type: "TOGGLE_EXPANDED"; value: Exclude<ExpandedSection, null> }
  | { type: "SET_MOVE_MODE"; value: MoveMode }
  | { type: "SET_SPLIT_AMOUNT_TEXT"; value: string }
  | { type: "SET_SPLIT_DESTINATION"; value: number | null }
  | { type: "SET_REMOVE_KIND"; value: RemoveKind }
  | {
      type: "SET_SELL_QTY_TEXT";
      value: string;
      unitValue: number | null;
      maxQuantity: number;
    }
  | { type: "SET_SELL_AMOUNT_TEXT"; value: string }
  | { type: "SET_SELL_CURRENCY"; value: CoinDenomination }
  | { type: "SET_ADD_TO_PURSE"; value: boolean }
  | { type: "SET_SELL_NOTE"; value: string }
  | { type: "SET_DROP_QTY_TEXT"; value: string }
  | { type: "SET_DROP_NOTE"; value: string }
  | { type: "SET_TRANSFER_TARGET"; value: number | null }
  | { type: "RESET_SELL_DRAFT" }
  | { type: "RESET_DROP_DRAFT" }
  | { type: "RESET_SPLIT_DRAFT" };

const formatAmount = (amount: number): string =>
  String(Number(amount.toFixed(2)));

const parseQuantityText = (text: string, max: number): number =>
  Math.min(max, Math.max(1, Number.parseInt(text, 10) || 1));

const parseOptionalNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const createInitialState = ({
  item,
  initialTagIds,
}: {
  item: Item;
  initialTagIds: number[];
}): DetailState => ({
  name: item.name,
  description: item.description ?? "",
  quantityText: String(item.quantity),
  weightText: String(item.weight),
  valueText: item.value === null ? "" : String(item.value),
  valueCurrency: item.value_currency ?? "gp",
  rarity: item.rarity,
  selectedTagIds: [...initialTagIds],
  syncedItemQty: item.quantity,
  expanded: null,
  moveMode: "all",
  splitAmountText: "1",
  splitDestinationId: null,
  removeKind: "sell",
  sellQtyText: "1",
  sellAmountText: "",
  sellCurrency: item.value_currency ?? "gp",
  addToPurse: true,
  sellNote: "",
  dropQtyText: "1",
  dropNote: "",
  transferTargetId: null,
});

const detailReducer = (
  state: DetailState,
  action: DetailAction,
): DetailState => {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_DESCRIPTION":
      return { ...state, description: action.value };
    case "SET_QUANTITY_TEXT":
      return { ...state, quantityText: action.value };
    case "SET_WEIGHT_TEXT":
      return { ...state, weightText: action.value };
    case "SET_VALUE_TEXT":
      return { ...state, valueText: action.value };
    case "SET_VALUE_CURRENCY":
      return { ...state, valueCurrency: action.value };
    case "SET_RARITY":
      return { ...state, rarity: action.value };
    case "TOGGLE_TAG":
      return {
        ...state,
        selectedTagIds: state.selectedTagIds.includes(action.tagId)
          ? state.selectedTagIds.filter((id) => id !== action.tagId)
          : [...state.selectedTagIds, action.tagId],
      };
    case "SYNC_LIVE_QUANTITY": {
      if (state.syncedItemQty === action.quantity) {
        return state;
      }
      const maxQty = Math.max(1, action.quantity);
      const maxSplit = Math.max(1, action.quantity - 1);
      // Only follow live quantity updates while the field still shows the
      // value it was last synced to, so unsaved typing is never overwritten.
      return {
        ...state,
        syncedItemQty: action.quantity,
        quantityText:
          state.quantityText === String(state.syncedItemQty)
            ? String(action.quantity)
            : state.quantityText,
        sellQtyText:
          parseQuantityText(state.sellQtyText, state.syncedItemQty) > maxQty
            ? String(maxQty)
            : state.sellQtyText,
        dropQtyText:
          parseQuantityText(state.dropQtyText, state.syncedItemQty) > maxQty
            ? String(maxQty)
            : state.dropQtyText,
        splitAmountText:
          parseQuantityText(state.splitAmountText, Math.max(1, state.syncedItemQty - 1)) > maxSplit
            ? String(maxSplit)
            : state.splitAmountText,
      };
    }
    case "SET_EXPANDED":
      return { ...state, expanded: action.value };
    case "TOGGLE_EXPANDED":
      return {
        ...state,
        expanded: state.expanded === action.value ? null : action.value,
      };
    case "SET_MOVE_MODE":
      return { ...state, moveMode: action.value };
    case "SET_SPLIT_AMOUNT_TEXT":
      return { ...state, splitAmountText: action.value };
    case "SET_SPLIT_DESTINATION":
      return { ...state, splitDestinationId: action.value };
    case "SET_REMOVE_KIND":
      return { ...state, removeKind: action.value };
    case "SET_SELL_QTY_TEXT": {
      const unitValue =
        action.unitValue !== null && action.unitValue > 0
          ? action.unitValue
          : null;
      const previousQty = parseQuantityText(
        state.sellQtyText,
        action.maxQuantity,
      );
      const nextQty = parseQuantityText(action.value, action.maxQuantity);
      const trimmedAmount = state.sellAmountText.trim();
      let nextAmount = state.sellAmountText;
      if (unitValue !== null) {
        // Keep quick-picked (100% or 50%) prices in step with quantity without
        // overwriting a custom price the user typed themselves.
        for (const ratio of [1, 0.5] as const) {
          if (trimmedAmount === formatAmount(unitValue * previousQty * ratio)) {
            nextAmount = formatAmount(unitValue * nextQty * ratio);
            break;
          }
        }
      }
      return {
        ...state,
        sellQtyText: action.value,
        sellAmountText: nextAmount,
      };
    }
    case "SET_SELL_AMOUNT_TEXT":
      return { ...state, sellAmountText: action.value };
    case "SET_SELL_CURRENCY":
      return { ...state, sellCurrency: action.value };
    case "SET_ADD_TO_PURSE":
      return { ...state, addToPurse: action.value };
    case "SET_SELL_NOTE":
      return { ...state, sellNote: action.value };
    case "SET_DROP_QTY_TEXT":
      return { ...state, dropQtyText: action.value };
    case "SET_DROP_NOTE":
      return { ...state, dropNote: action.value };
    case "SET_TRANSFER_TARGET":
      return { ...state, transferTargetId: action.value };
    case "RESET_SELL_DRAFT":
      return {
        ...state,
        expanded: null,
        sellQtyText: "1",
        sellAmountText: "",
        sellNote: "",
      };
    case "RESET_DROP_DRAFT":
      return {
        ...state,
        expanded: null,
        dropQtyText: "1",
        dropNote: "",
      };
    case "RESET_SPLIT_DRAFT":
      return {
        ...state,
        splitAmountText: "1",
        splitDestinationId: null,
        moveMode: "all",
      };
    default:
      return state;
  }
};

interface ChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  filled?: boolean;
  color?: string;
  testID?: string;
}

const Chip = ({
  label,
  onPress,
  selected = false,
  filled,
  color,
  testID,
}: ChipProps) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => ({
        opacity: pressed ? theme.opacity.pressed : 1,
      })}
    >
      <Badge text={label} color={color} filled={filled ?? selected} />
    </Pressable>
  );
};

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
};

const ItemDetail = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {parsedItemId === null ? (
        <>
          <AppHeader title="Item" />
          <ScreenState
            kind="message"
            message="Item not found"
            actionLabel="Back"
            onAction={goBack}
            actionTestID="item-not-found-back"
          />
        </>
      ) : (
        <ItemDetailContent itemId={parsedItemId} />
      )}
    </View>
  );
};

const ItemDetailContent = ({ itemId }: { itemId: number }) => {
  const item = useItem(itemId);
  const tagLinks = useItemTagLinks(itemId);

  if (item.status === "error" || tagLinks.error) {
    return (
      <>
        <AppHeader title="Item" />
        <ScreenState
          kind="message"
          message="Failed to load item"
          actionLabel="Back"
          onAction={goBack}
        />
      </>
    );
  }

  if (item.status === "loading" || !tagLinks.isReady) {
    return (
      <>
        <AppHeader title="Item" />
        <ScreenState kind="loading" />
      </>
    );
  }

  if (item.status === "missing") {
    return (
      <>
        <AppHeader title="Item" />
        <ScreenState
          kind="message"
          message="Item not found"
          actionLabel="Back"
          onAction={goBack}
          actionTestID="item-not-found-back"
        />
      </>
    );
  }

  return (
    <ItemDetailBody
      key={item.data.item_id}
      item={item.data}
      initialTagIds={tagLinks.tagIds}
    />
  );
};

interface ItemDetailBodyProps {
  item: Item;
  initialTagIds: number[];
}

const ItemDetailBody = ({ item, initialTagIds }: ItemDetailBodyProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isLargeText } = useLayout();
  const db = useDatabase();

  const [draft, dispatch] = useReducer(
    detailReducer,
    { item, initialTagIds },
    createInitialState,
  );
  const [leaving, setLeaving] = useState(false);
  const actionLockRef = useRef(false);

  const characterQuery = useCharacter(item.character_id);
  const containers = useCharacterContainers(item.character_id);
  const allTags = useCharacterTags(item.character_id);
  const characters = useActiveCharacters();

  const saveAction = useAsyncAction();
  const moveAction = useAsyncAction();
  const splitAction = useAsyncAction();
  const useAction = useAsyncAction();
  const removeAction = useAsyncAction();
  const transferAction = useAsyncAction({ keepBusyOnSuccess: true });
  const deleteAction = useAsyncAction({ keepBusyOnSuccess: true });

  const busy =
    leaving ||
    saveAction.submitting ||
    moveAction.submitting ||
    splitAction.submitting ||
    useAction.submitting ||
    removeAction.submitting ||
    transferAction.submitting ||
    deleteAction.submitting;

  useEffect(() => {
    dispatch({ type: "SYNC_LIVE_QUANTITY", quantity: item.quantity });
  }, [item.quantity]);

  const containerList = containers.data;
  const currentContainer = containerList.find(
    (container) => container.storage_location_id === item.storage_location_id,
  );
  const otherContainers = containerList.filter(
    (container) => container.storage_location_id !== item.storage_location_id,
  );

  const activeTagIds = new Set(allTags.map((tag) => tag.tag_id));
  const visibleSelectedTagIds = draft.selectedTagIds.filter((id) =>
    activeTagIds.has(id),
  );
  const activeSelectedTags = allTags.filter((tag) =>
    visibleSelectedTagIds.includes(tag.tag_id),
  );
  const childrenByParent = new Map<number, typeof allTags>();
  for (const tag of allTags) {
    if (tag.parent_tag_id !== null && activeTagIds.has(tag.parent_tag_id)) {
      const existing = childrenByParent.get(tag.parent_tag_id) ?? [];
      existing.push(tag);
      childrenByParent.set(tag.parent_tag_id, existing);
    }
  }

  const otherCharacters = characters.data.filter(
    (character) => character.character_id !== item.character_id,
  );

  const purse: CoinPurse | null =
    characterQuery.status === "ready"
      ? {
          platinum: characterQuery.data.platinum,
          gold: characterQuery.data.gold,
          silver: characterQuery.data.silver,
          copper: characterQuery.data.copper,
        }
      : null;

  const showWeight =
    characterQuery.status !== "ready" || characterQuery.data.weight_tracking;

  const parsedQuantity = Math.max(
    1,
    Number.parseInt(draft.quantityText, 10) || 1,
  );
  const parsedWeight = Math.max(0, Number.parseFloat(draft.weightText) || 0);
  const parsedDraftValue = parseOptionalNumber(draft.valueText);

  const normalizedDescription =
    draft.description.trim().length === 0 ? null : draft.description.trim();
  const normalizedItemDescription =
    item.description !== null && item.description.trim().length > 0
      ? item.description.trim()
      : null;
  const initialVisibleTagIds = initialTagIds
    .filter((id) => activeTagIds.has(id))
    .sort((a, b) => a - b);
  const sortedSelectedTagIds = [...visibleSelectedTagIds].sort((a, b) => a - b);
  const tagsDirty =
    initialVisibleTagIds.length !== sortedSelectedTagIds.length ||
    initialVisibleTagIds.some(
      (id, index) => id !== sortedSelectedTagIds[index],
    );

  const isDirty =
    draft.name.trim() !== item.name ||
    normalizedDescription !== normalizedItemDescription ||
    parsedQuantity !== item.quantity ||
    parsedWeight !== item.weight ||
    parsedDraftValue !== item.value ||
    (parsedDraftValue !== null &&
      draft.valueCurrency !== (item.value_currency ?? "gp")) ||
    draft.rarity !== item.rarity ||
    tagsDirty;

  const canSave = !busy && draft.name.trim().length > 0;

  const hasOtherCharacters = otherCharacters.length > 0;
  const removeKind: RemoveKind =
    draft.removeKind === "transfer" && !hasOtherCharacters
      ? "sell"
      : draft.removeKind;

  const sellQty = parseQuantityText(draft.sellQtyText, item.quantity);
  const parsedSellAmount = Math.max(
    0,
    Number.parseFloat(draft.sellAmountText) || 0,
  );
  const sellTarget = item.quantity > 1 ? String(sellQty) : "item";
  const sellButtonTitle =
    parsedSellAmount > 0
      ? `Sell ${sellTarget} for ${formatCoinAmount(parsedSellAmount, draft.sellCurrency)}`
      : `Sell ${sellTarget}`;

  const quickAmounts: QuickAmountOption[] =
    parsedDraftValue !== null && parsedDraftValue > 0
      ? [
          {
            label: `50% (${formatCoinAmount(parsedDraftValue * sellQty * 0.5, draft.valueCurrency)})`,
            amount: formatAmount(parsedDraftValue * sellQty * 0.5),
            currency: draft.valueCurrency,
          },
          {
            label: `100% (${formatCoinAmount(parsedDraftValue * sellQty, draft.valueCurrency)})`,
            amount: formatAmount(parsedDraftValue * sellQty),
            currency: draft.valueCurrency,
          },
        ]
      : [];

  const dropQty = parseQuantityText(draft.dropQtyText, item.quantity);
  const dropButtonTitle = item.quantity > 1 ? `Drop ${dropQty}` : "Drop item";

  const parsedSplitAmount = Number.parseInt(draft.splitAmountText, 10) || 0;
  const splitAmountValid =
    parsedSplitAmount >= 1 && parsedSplitAmount <= item.quantity - 1;
  const splitMode =
    draft.moveMode === "split" &&
    item.quantity > 1 &&
    otherContainers.length > 0;
  const validSplitDestinationId = otherContainers.some(
    (container) => container.storage_location_id === draft.splitDestinationId,
  )
    ? draft.splitDestinationId
    : null;

  const soleOtherCharacter =
    otherCharacters.length === 1 ? otherCharacters[0] : undefined;
  const effectiveTransferTargetId =
    draft.transferTargetId ?? soleOtherCharacter?.character_id ?? null;
  const selectedTransferTarget =
    otherCharacters.find(
      (character) => character.character_id === effectiveTransferTargetId,
    ) ?? null;
  const validTransferTargetId = selectedTransferTarget?.character_id ?? null;

  const canUse = activeSelectedTags.some((tag) => tag.is_usable);

  const prefillSellPrice = () => {
    if (
      draft.sellAmountText.trim().length === 0 &&
      parsedDraftValue !== null &&
      parsedDraftValue > 0
    ) {
      dispatch({
        type: "SET_SELL_AMOUNT_TEXT",
        value: formatAmount(parsedDraftValue * sellQty),
      });
      dispatch({ type: "SET_SELL_CURRENCY", value: draft.valueCurrency });
    }
  };

  const toggleSection = (section: Exclude<ExpandedSection, null>) => {
    if (section !== "value") {
      Keyboard.dismiss();
    }
    dispatch({ type: "TOGGLE_EXPANDED", value: section });
  };

  const handleToggleRemoveSection = () => {
    Keyboard.dismiss();
    if (draft.expanded === "remove") {
      dispatch({ type: "SET_EXPANDED", value: null });
      return;
    }
    dispatch({ type: "SET_EXPANDED", value: "remove" });
    if (removeKind === "sell") {
      prefillSellPrice();
    }
  };

  const handleSelectRemoveKind = (kind: RemoveKind) => {
    Keyboard.dismiss();
    dispatch({ type: "SET_REMOVE_KIND", value: kind });
    if (kind === "sell") {
      prefillSellPrice();
    }
  };

  const runExclusive = (
    action: {
      run: (
        work: () => Promise<void>,
        fallbackMessage?: string,
      ) => Promise<boolean>;
    },
    work: () => Promise<boolean | void>,
    fallbackMessage: string,
  ) => {
    if (busy || actionLockRef.current) {
      return;
    }
    actionLockRef.current = true;
    let shouldStayLocked = false;
    void action
      .run(async () => {
        const exited = await work();
        if (exited === true) {
          shouldStayLocked = true;
          setLeaving(true);
          goBack();
        }
      }, fallbackMessage)
      .finally(() => {
        if (!shouldStayLocked) {
          actionLockRef.current = false;
        }
      });
  };

  const handleSave = () => {
    if (draft.name.trim().length === 0) {
      return;
    }
    Keyboard.dismiss();
    runExclusive(
      saveAction,
      async () => {
        await updateItemDetails(
          db,
          item.item_id,
          {
            name: draft.name.trim(),
            description: normalizedDescription,
            item_type: item.item_type,
            weight: parsedWeight,
            rarity: draft.rarity,
            quantity: parsedQuantity,
            value: parsedDraftValue,
            value_currency:
              parsedDraftValue === null ? null : draft.valueCurrency,
            properties: item.properties,
          },
          visibleSelectedTagIds,
        );
      },
      "Failed to save item.",
    );
  };

  const handleUseOne = () => {
    const lastOne = item.quantity <= 1;
    runExclusive(
      useAction,
      async () => {
        await useOneFromItem(db, item.item_id);
        return lastOne;
      },
      "Failed to use item.",
    );
  };

  const handleMoveTo = (destinationId: number) => {
    if (destinationId === item.storage_location_id) {
      return;
    }
    runExclusive(
      moveAction,
      async () => {
        await moveItemToContainer(db, item.item_id, destinationId);
        if (draft.splitDestinationId === destinationId) {
          dispatch({ type: "SET_SPLIT_DESTINATION", value: null });
        }
      },
      "Failed to move item.",
    );
  };

  const handleSplit = () => {
    if (!splitAmountValid || validSplitDestinationId === null) {
      return;
    }
    const destinationId = validSplitDestinationId;
    const amount = parsedSplitAmount;
    runExclusive(
      splitAction,
      async () => {
        await splitItemStack(db, item.item_id, amount, destinationId);
        dispatch({ type: "RESET_SPLIT_DRAFT" });
      },
      "Failed to split stack.",
    );
  };

  const handleSell = () => {
    Keyboard.dismiss();
    const note = draft.sellNote.trim();
    runExclusive(
      removeAction,
      async () => {
        const result = await removeItemsFromStack(db, item.item_id, {
          kind: "sold",
          quantity: sellQty,
          amount: parsedSellAmount,
          denomination: draft.sellCurrency,
          addToPurse: draft.addToPurse,
          note: note.length > 0 ? note : undefined,
        });
        if (result.removedAll) {
          return true;
        }
        dispatch({ type: "RESET_SELL_DRAFT" });
      },
      "Failed to sell item.",
    );
  };

  const handleDrop = () => {
    Keyboard.dismiss();
    const note = draft.dropNote.trim();
    runExclusive(
      removeAction,
      async () => {
        const result = await removeItemsFromStack(db, item.item_id, {
          kind: "dropped",
          quantity: dropQty,
          note: note.length > 0 ? note : undefined,
        });
        if (result.removedAll) {
          return true;
        }
        dispatch({ type: "RESET_DROP_DRAFT" });
      },
      "Failed to drop item.",
    );
  };

  const handleTransfer = () => {
    if (validTransferTargetId === null) {
      return;
    }
    Keyboard.dismiss();
    const targetId = validTransferTargetId;
    runExclusive(
      transferAction,
      async () => {
        await transferItemToCharacter(db, item.item_id, targetId);
        return true;
      },
      "Failed to transfer item.",
    );
  };

  const handleDelete = () => {
    Keyboard.dismiss();
    runExclusive(
      deleteAction,
      async () => {
        await deleteItemRow(db, item.item_id);
        return true;
      },
      "Failed to delete item.",
    );
  };

  const heroInputStyle = {
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  } as const;

  const chipRow = {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  } as const;

  const expandedBody = {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  } as const;

  const adjustQuantity = (delta: number) => {
    const current = Number.parseInt(draft.quantityText, 10) || 1;
    dispatch({
      type: "SET_QUANTITY_TEXT",
      value: String(Math.max(1, current + delta)),
    });
  };

  const adjustWeight = (delta: number) => {
    dispatch({
      type: "SET_WEIGHT_TEXT",
      value: String(
        Math.max(0, (Number.parseFloat(draft.weightText) || 0) + delta),
      ),
    });
  };

  const setSellQtyText = (value: string) => {
    dispatch({
      type: "SET_SELL_QTY_TEXT",
      value,
      unitValue: parsedDraftValue,
      maxQuantity: item.quantity,
    });
  };

  const adjustSellQty = (delta: number) => {
    setSellQtyText(String(parseQuantityText(String(sellQty + delta), item.quantity)));
  };

  const adjustDropQty = (delta: number) => {
    dispatch({
      type: "SET_DROP_QTY_TEXT",
      value: String(parseQuantityText(String(dropQty + delta), item.quantity)),
    });
  };

  const adjustSplitAmount = (delta: number) => {
    dispatch({
      type: "SET_SPLIT_AMOUNT_TEXT",
      value: String(
        Math.min(
          Math.max(1, item.quantity - 1),
          Math.max(1, parsedSplitAmount + delta),
        ),
      ),
    });
  };

  const actionError =
    saveAction.error ??
    moveAction.error ??
    splitAction.error ??
    useAction.error ??
    removeAction.error ??
    transferAction.error ??
    deleteAction.error;

  const unitChipColor = (selected: boolean) =>
    selected ? theme.colors.accent : theme.colors.border;

  const removeSummary =
    draft.expanded === "remove"
      ? `${removeKind.charAt(0).toUpperCase()}${removeKind.slice(1)}`
      : "Sell, drop…";

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Item"
        rightAction={
          isDirty ? (
            <Button
              title="Save"
              size="sm"
              onPress={handleSave}
              loading={saveAction.submitting}
              disabled={!canSave}
              testID="save-item-button"
            />
          ) : undefined
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          testID="item-detail-screen"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.spacing.md,
            paddingBottom:
              theme.spacing.lg +
              (Platform.OS === "android" ? insets.bottom : 0),
            gap: theme.spacing.md,
          }}
        >
          <View style={{ gap: theme.spacing.xs }}>
            <Input
              value={draft.name}
              onChangeText={(text) =>
                dispatch({ type: "SET_NAME", value: text })
              }
              placeholder="Name"
              accessibilityLabel="Item name"
              testID="item-name-input"
              style={[theme.type.title, heroInputStyle]}
            />
            <Input
              value={draft.description}
              onChangeText={(text) =>
                dispatch({ type: "SET_DESCRIPTION", value: text })
              }
              placeholder="Add description"
              accessibilityLabel="Description"
              multiline
              textAlignVertical="top"
              testID="item-description-input"
              style={[
                theme.type.body,
                heroInputStyle,
                {
                  minHeight: theme.layout.touchMin,
                  paddingVertical: theme.spacing.xs,
                },
              ]}
            />
            {draft.rarity !== "Common" || activeSelectedTags.length > 0 ? (
              <View style={chipRow}>
                {draft.rarity !== "Common" ? (
                  <Chip
                    label={draft.rarity}
                    onPress={() => toggleSection("rarity")}
                    selected
                    color={rarityColors[draft.rarity]}
                    testID="item-rarity-badge"
                  />
                ) : null}
                {activeSelectedTags.map((tag) => (
                  <Chip
                    key={`item-hero-tag-${tag.tag_id}`}
                    label={tag.name}
                    onPress={() => toggleSection("tags")}
                    selected
                    filled={false}
                    color={theme.colors.accent}
                    testID={`item-hero-tag-${tag.name.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <SectionLabel label="Quantity" />
              <NumericInput
                keyboardType="number-pad"
                value={draft.quantityText}
                testID="item-quantity-input"
                onChangeText={(text) =>
                  dispatch({ type: "SET_QUANTITY_TEXT", value: text })
                }
                buttonDecrement={() => adjustQuantity(-1)}
                buttonIncrement={() => adjustQuantity(1)}
              />
            </View>
            {showWeight ? (
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <SectionLabel label="Weight" />
                <NumericInput
                  value={draft.weightText}
                  testID="item-weight-input"
                  onChangeText={(text) =>
                    dispatch({ type: "SET_WEIGHT_TEXT", value: text })
                  }
                  buttonDecrement={() => adjustWeight(-0.5)}
                  buttonIncrement={() => adjustWeight(0.5)}
                />
                {parsedQuantity > 1 ? (
                  <ThemedText
                    variant="caption"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatWeight(parsedWeight * parsedQuantity)} total
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
          </View>

          {canUse ? (
            <Button
              title="Use 1"
              testID="use-item-button"
              onPress={handleUseOne}
              loading={useAction.submitting}
              disabled={busy}
              fullWidth
            />
          ) : null}

          <View style={{ gap: theme.spacing.xs }}>
            <SectionLabel label="Details" />
            <DisclosureCard>
              <DisclosureRow
                label="Container"
                summary={currentContainer?.name ?? "None"}
                highlighted
                isOpen={draft.expanded === "container"}
                onPress={() => toggleSection("container")}
                testID="item-container-row"
              />
              {draft.expanded === "container" ? (
                <View style={expandedBody}>
                  {item.quantity > 1 && otherContainers.length > 0 ? (
                    <View style={chipRow}>
                      <Chip
                        label={`Move all (${item.quantity})`}
                        onPress={() =>
                          dispatch({ type: "SET_MOVE_MODE", value: "all" })
                        }
                        selected={draft.moveMode === "all"}
                        color={unitChipColor(draft.moveMode === "all")}
                        testID="move-mode-all"
                      />
                      <Chip
                        label="Split stack"
                        onPress={() =>
                          dispatch({ type: "SET_MOVE_MODE", value: "split" })
                        }
                        selected={draft.moveMode === "split"}
                        color={unitChipColor(draft.moveMode === "split")}
                        testID="move-mode-split"
                      />
                    </View>
                  ) : null}
                  {splitMode ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <NumericInput
                        keyboardType="number-pad"
                        value={draft.splitAmountText}
                        testID="split-amount-input"
                        onChangeText={(text) =>
                          dispatch({
                            type: "SET_SPLIT_AMOUNT_TEXT",
                            value: text,
                          })
                        }
                        buttonDecrement={() => adjustSplitAmount(-1)}
                        buttonIncrement={() => adjustSplitAmount(1)}
                      />
                      <ThemedText variant="caption">
                        {`Choose 1 to ${item.quantity - 1}`}
                      </ThemedText>
                      <View style={chipRow}>
                        {otherContainers.map((container) => {
                          const selected =
                            draft.splitDestinationId ===
                            container.storage_location_id;
                          return (
                            <Chip
                              key={`split-destination-${container.storage_location_id}`}
                              label={container.name}
                              onPress={() =>
                                dispatch({
                                  type: "SET_SPLIT_DESTINATION",
                                  value: container.storage_location_id,
                                })
                              }
                              selected={selected}
                              color={unitChipColor(selected)}
                              testID={`split-destination-${container.storage_location_id}`}
                            />
                          );
                        })}
                      </View>
                      <Button
                        title="Split"
                        size="sm"
                        testID="confirm-split-button"
                        onPress={handleSplit}
                        loading={splitAction.submitting}
                        disabled={
                          busy ||
                          !splitAmountValid ||
                          validSplitDestinationId === null
                        }
                        fullWidth
                      />
                    </View>
                  ) : (
                    <View style={chipRow}>
                      {containerList.map((container) => {
                        const selected =
                          container.storage_location_id ===
                          item.storage_location_id;
                        return (
                          <Chip
                            key={`item-container-${container.storage_location_id}`}
                            label={container.name}
                            onPress={() =>
                              handleMoveTo(container.storage_location_id)
                            }
                            selected={selected}
                            color={unitChipColor(selected)}
                            testID={`item-container-${container.storage_location_id}`}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}
              <CardDivider />
              <DisclosureRow
                label="Tags"
                summary={
                  activeSelectedTags.length > 0
                    ? activeSelectedTags.map((tag) => tag.name).join(", ")
                    : "Add"
                }
                highlighted={activeSelectedTags.length > 0}
                isOpen={draft.expanded === "tags"}
                onPress={() => toggleSection("tags")}
                testID="item-tags-row"
              />
              {draft.expanded === "tags" ? (
                <View style={expandedBody}>
                  <View style={chipRow}>
                    {allTags.map((tag) => {
                      const children = childrenByParent.get(tag.tag_id) ?? [];
                      const childSelected = children.some((child) =>
                        visibleSelectedTagIds.includes(child.tag_id),
                      );
                      const selected = visibleSelectedTagIds.includes(
                        tag.tag_id,
                      );
                      return (
                        <Chip
                          key={`item-tag-${tag.tag_id}`}
                          label={tag.name}
                          onPress={() =>
                            dispatch({ type: "TOGGLE_TAG", tagId: tag.tag_id })
                          }
                          selected={selected || childSelected}
                          filled={selected}
                          color={
                            selected || childSelected
                              ? theme.colors.accent
                              : theme.colors.border
                          }
                          testID={`item-tag-${tag.name.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <CardDivider />
              <DisclosureRow
                label="Value"
                summary={
                  draft.valueText.trim().length > 0
                    ? `${draft.valueText.trim()} ${draft.valueCurrency}`
                    : "Add"
                }
                highlighted={draft.valueText.trim().length > 0}
                isOpen={draft.expanded === "value"}
                onPress={() => toggleSection("value")}
                testID="item-value-row"
              />
              {draft.expanded === "value" ? (
                <View
                  style={
                    isLargeText
                      ? expandedBody
                      : [
                          expandedBody,
                          { flexDirection: "row", alignItems: "center" },
                        ]
                  }
                >
                  <View style={isLargeText ? undefined : { flex: 1 }}>
                    <Input
                      keyboardType="decimal-pad"
                      placeholder="Value"
                      value={draft.valueText}
                      onChangeText={(text) =>
                        dispatch({ type: "SET_VALUE_TEXT", value: text })
                      }
                      testID="item-value-input"
                    />
                  </View>
                  <View style={chipRow}>
                    {COIN_DENOMINATIONS.map((unit) => {
                      const selected = draft.valueCurrency === unit;
                      return (
                        <Chip
                          key={`item-value-unit-${unit}`}
                          label={unit}
                          onPress={() =>
                            dispatch({
                              type: "SET_VALUE_CURRENCY",
                              value: unit,
                            })
                          }
                          selected={selected}
                          color={unitChipColor(selected)}
                          testID={`item-value-unit-${unit}`}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <CardDivider />
              <DisclosureRow
                label="Rarity"
                summary={draft.rarity}
                highlighted={draft.rarity !== "Common"}
                isOpen={draft.expanded === "rarity"}
                onPress={() => toggleSection("rarity")}
                testID="item-rarity-row"
              />
              {draft.expanded === "rarity" ? (
                <View style={expandedBody}>
                  <RarityPicker
                    value={draft.rarity}
                    onChange={(rarity) =>
                      dispatch({ type: "SET_RARITY", value: rarity })
                    }
                    testIdPrefix="item-rarity"
                  />
                </View>
              ) : null}
            </DisclosureCard>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <SectionLabel label="Actions" />
            <DisclosureCard>
              <DisclosureRow
                label="Remove item"
                summary={removeSummary}
                highlighted={draft.expanded === "remove"}
                isOpen={draft.expanded === "remove"}
                onPress={handleToggleRemoveSection}
                testID="item-remove-row"
              />
              {draft.expanded === "remove" ? (
                <View style={expandedBody}>
                  <View style={chipRow}>
                    <Chip
                      label="Sell"
                      onPress={() => handleSelectRemoveKind("sell")}
                      selected={removeKind === "sell"}
                      color={unitChipColor(removeKind === "sell")}
                      testID="item-remove-sell"
                    />
                    <Chip
                      label="Drop"
                      onPress={() => handleSelectRemoveKind("drop")}
                      selected={removeKind === "drop"}
                      color={unitChipColor(removeKind === "drop")}
                      testID="item-remove-drop"
                    />
                    {hasOtherCharacters ? (
                      <Chip
                        label="Transfer"
                        onPress={() => handleSelectRemoveKind("transfer")}
                        selected={removeKind === "transfer"}
                        color={unitChipColor(removeKind === "transfer")}
                        testID="item-remove-transfer"
                      />
                    ) : null}
                    <Chip
                      label="Delete"
                      onPress={() => handleSelectRemoveKind("delete")}
                      selected={removeKind === "delete"}
                      color={theme.colors.error}
                      filled={removeKind === "delete"}
                      testID="item-remove-delete"
                    />
                  </View>

                  {removeKind === "sell" ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      {item.quantity > 1 ? (
                        <View style={{ gap: theme.spacing.sm }}>
                          <NumericInput
                            keyboardType="number-pad"
                            value={draft.sellQtyText}
                            testID="sell-quantity-input"
                            onChangeText={setSellQtyText}
                            buttonDecrement={() => adjustSellQty(-1)}
                            buttonIncrement={() => adjustSellQty(1)}
                          />
                          <View style={chipRow}>
                            <Chip
                              label="1"
                              onPress={() => setSellQtyText("1")}
                              selected={sellQty === 1}
                              color={unitChipColor(sellQty === 1)}
                              testID="sell-qty-one"
                            />
                            <Chip
                              label={`All (${item.quantity})`}
                              onPress={() =>
                                setSellQtyText(String(item.quantity))
                              }
                              selected={sellQty === item.quantity}
                              color={unitChipColor(sellQty === item.quantity)}
                              testID="sell-qty-all"
                            />
                          </View>
                        </View>
                      ) : null}
                      <PurseTransactionFields
                        mode="credit"
                        amountText={draft.sellAmountText}
                        onChangeAmountText={(text) =>
                          dispatch({
                            type: "SET_SELL_AMOUNT_TEXT",
                            value: text,
                          })
                        }
                        currency={draft.sellCurrency}
                        onChangeCurrency={(unit) =>
                          dispatch({ type: "SET_SELL_CURRENCY", value: unit })
                        }
                        purse={purse}
                        applyToPurse={draft.addToPurse}
                        onChangeApplyToPurse={(value) =>
                          dispatch({ type: "SET_ADD_TO_PURSE", value })
                        }
                        note={draft.sellNote}
                        onChangeNote={(text) =>
                          dispatch({ type: "SET_SELL_NOTE", value: text })
                        }
                        amountPlaceholder="Sale price"
                        notePlaceholder="Buyer / note (optional)"
                        quickAmounts={quickAmounts}
                        testIds={{
                          amountInput: "sell-amount-input",
                          unitPrefix: "sell-unit",
                          toggle: "sell-add-purse-toggle",
                          noteInput: "sell-note-input",
                        }}
                      />
                      <Button
                        title={sellButtonTitle}
                        testID="confirm-sell-button"
                        onPress={handleSell}
                        loading={removeAction.submitting}
                        disabled={busy}
                        fullWidth
                      />
                    </View>
                  ) : null}

                  {removeKind === "drop" ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      {item.quantity > 1 ? (
                        <View style={{ gap: theme.spacing.sm }}>
                          <NumericInput
                            keyboardType="number-pad"
                            value={draft.dropQtyText}
                            testID="drop-quantity-input"
                            onChangeText={(text) =>
                              dispatch({
                                type: "SET_DROP_QTY_TEXT",
                                value: text,
                              })
                            }
                            buttonDecrement={() => adjustDropQty(-1)}
                            buttonIncrement={() => adjustDropQty(1)}
                          />
                          <View style={chipRow}>
                            <Chip
                              label="1"
                              onPress={() =>
                                dispatch({
                                  type: "SET_DROP_QTY_TEXT",
                                  value: "1",
                                })
                              }
                              selected={dropQty === 1}
                              color={unitChipColor(dropQty === 1)}
                              testID="drop-qty-one"
                            />
                            <Chip
                              label={`All (${item.quantity})`}
                              onPress={() =>
                                dispatch({
                                  type: "SET_DROP_QTY_TEXT",
                                  value: String(item.quantity),
                                })
                              }
                              selected={dropQty === item.quantity}
                              color={unitChipColor(dropQty === item.quantity)}
                              testID="drop-qty-all"
                            />
                          </View>
                        </View>
                      ) : null}
                      <Input
                        placeholder="Note (optional)"
                        value={draft.dropNote}
                        onChangeText={(text) =>
                          dispatch({ type: "SET_DROP_NOTE", value: text })
                        }
                        testID="drop-note-input"
                      />
                      <Button
                        title={dropButtonTitle}
                        testID="confirm-drop-button"
                        onPress={handleDrop}
                        loading={removeAction.submitting}
                        disabled={busy}
                        fullWidth
                      />
                    </View>
                  ) : null}

                  {removeKind === "transfer" && hasOtherCharacters ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <View style={chipRow}>
                        {otherCharacters.map((character) => {
                          const selected =
                            character.character_id ===
                            effectiveTransferTargetId;
                          return (
                            <Chip
                              key={`transfer-target-${character.character_id}`}
                              label={character.name}
                              onPress={() =>
                                dispatch({
                                  type: "SET_TRANSFER_TARGET",
                                  value: character.character_id,
                                })
                              }
                              selected={selected}
                              color={unitChipColor(selected)}
                              testID={`transfer-target-${character.character_id}`}
                            />
                          );
                        })}
                      </View>
                      <Button
                        title={
                          selectedTransferTarget !== null
                            ? `Transfer to ${selectedTransferTarget.name}`
                            : "Transfer"
                        }
                        testID="confirm-transfer-button"
                        onPress={handleTransfer}
                        loading={transferAction.submitting}
                        disabled={busy || validTransferTargetId === null}
                        fullWidth
                      />
                    </View>
                  ) : null}

                  {removeKind === "delete" ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <ThemedText variant="caption">
                        Removes this item without changing your purse.
                      </ThemedText>
                      <Button
                        title="Delete item"
                        testID="delete-item-button"
                        variant="secondary"
                        onPress={handleDelete}
                        loading={deleteAction.submitting}
                        disabled={busy}
                        fullWidth
                        style={{ borderColor: theme.colors.error }}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </DisclosureCard>
          </View>

          {actionError !== null ? (
            <ThemedText variant="caption" style={{ color: theme.colors.error }}>
              {actionError}
            </ThemedText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ItemDetail;
