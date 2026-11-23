import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "INVENTORY_DISPLAY_PREFS";

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
    const keys: (keyof InventoryDisplayPrefs)[] = [
      "showQuantity",
      "showWeight",
      "showValue",
      "showTags",
      "showRarity",
      "showQuickUse",
    ];
    for (const key of keys) {
      if (typeof record[key] === "boolean") {
        result[key] = record[key];
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const InventoryDisplayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [prefs, setPrefs] = useState<InventoryDisplayPrefs>(
    DEFAULT_INVENTORY_DISPLAY_PREFS,
  );

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || raw === null) {
          return;
        }
        setPrefs((prev) => ({ ...prev, ...parseStoredPrefs(raw) }));
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((next: InventoryDisplayPrefs) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
      console.error,
    );
  }, []);

  const setPref = useCallback(
    (key: keyof InventoryDisplayPrefs, value: boolean) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const togglePref = useCallback(
    (key: keyof InventoryDisplayPrefs) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

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
