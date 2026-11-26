import { INVENTORY_DISPLAY_PREFS } from "@/constants/CacheKeys";
import Storage from "expo-sqlite/kv-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface InventoryDisplayPrefs {
  showQuantity: boolean;
  showWeight: boolean;
  showValue: boolean;
  showTags: boolean;
  showRarity: boolean;
  showQuickUse: boolean;
}

export const DEFAULT_INVENTORY_DISPLAY_PREFS: InventoryDisplayPrefs = {
  showQuantity: true,
  showWeight: true,
  showValue: false,
  showTags: true,
  showRarity: true,
  showQuickUse: true,
};

const PREF_KEYS = Object.keys(
  DEFAULT_INVENTORY_DISPLAY_PREFS,
) as (keyof InventoryDisplayPrefs)[];

interface InventoryDisplayContextValue {
  prefs: InventoryDisplayPrefs;
  togglePref: (key: keyof InventoryDisplayPrefs) => void;
  setPref: (key: keyof InventoryDisplayPrefs, value: boolean) => void;
}

const InventoryDisplayContext =
  createContext<InventoryDisplayContextValue | null>(null);

const parseStoredPrefs = (raw: string): Partial<InventoryDisplayPrefs> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const record = parsed as Record<string, unknown>;
    const result: Partial<InventoryDisplayPrefs> = {};
    for (const key of PREF_KEYS) {
      if (typeof record[key] === "boolean") {
        result[key] = record[key];
      }
    }
    return result;
  } catch {
    return {};
  }
};

const loadStoredPrefs = (): InventoryDisplayPrefs => {
  try {
    const raw = Storage.getItemSync(INVENTORY_DISPLAY_PREFS);
    if (raw !== null) {
      return { ...DEFAULT_INVENTORY_DISPLAY_PREFS, ...parseStoredPrefs(raw) };
    }
  } catch (error) {
    console.error("[InventoryDisplayContext]: Error loading display prefs", error);
  }
  return DEFAULT_INVENTORY_DISPLAY_PREFS;
};

export const InventoryDisplayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [prefs, setPrefs] = useState<InventoryDisplayPrefs>(loadStoredPrefs);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    try {
      Storage.setItemSync(INVENTORY_DISPLAY_PREFS, JSON.stringify(prefs));
    } catch (error) {
      console.error(
        "[InventoryDisplayContext]: Error persisting display prefs",
        error,
      );
    }
  }, [prefs]);

  const setPref = useCallback(
    (key: keyof InventoryDisplayPrefs, value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const togglePref = useCallback((key: keyof InventoryDisplayPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const value = useMemo(
    () => ({ prefs, togglePref, setPref }),
    [prefs, togglePref, setPref],
  );

  return (
    <InventoryDisplayContext.Provider value={value}>
      {children}
    </InventoryDisplayContext.Provider>
  );
};

export const useInventoryDisplay = (): InventoryDisplayContextValue => {
  const ctx = useContext(InventoryDisplayContext);
  if (ctx === null) {
    throw new Error(
      "useInventoryDisplay must be used within InventoryDisplayProvider",
    );
  }
  return ctx;
};
