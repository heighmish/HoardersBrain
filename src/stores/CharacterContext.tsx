import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { resolveOrSeedInitialCharacter } from "@/db/repositories/characters";
import Storage from "expo-sqlite/kv-store";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type SelectedCharacter = {
  id: number;
  name: string;
};

export type CharacterSelectionState =
  | { status: "loading" }
  | { status: "noCharacter" }
  | { status: "characterSelected"; character: SelectedCharacter };

type CharacterContextType = {
  state: CharacterSelectionState;
  selectCharacter: (character: SelectedCharacter) => void;
  clearCharacter: () => void;
};

const CharacterContext = createContext<CharacterContextType | undefined>(
  undefined,
);

const readStoredCharacterId = (): number | null => {
  try {
    const raw = Storage.getItemSync(LAST_CHARACTER_ID);
    if (raw === null || !/^\d+$/.test(raw)) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  } catch (error) {
    console.error(
      "[CharacterContext]: Error reading last used character id",
      error,
    );
    return null;
  }
};

const persistCharacterId = (characterId: number | null) => {
  try {
    if (characterId === null) {
      Storage.removeItemSync(LAST_CHARACTER_ID);
    } else {
      Storage.setItemSync(LAST_CHARACTER_ID, String(characterId));
    }
  } catch (error) {
    console.error(
      "[CharacterContext]: Error persisting last used character id",
      error,
    );
  }
};

interface CharacterContextProps {
  children: ReactNode;
}

export const CharacterProvider: React.FC<CharacterContextProps> = ({
  children,
}) => {
  const [state, setState] = useState<CharacterSelectionState>({
    status: "loading",
  });
  const selectionRevisionRef = useRef(0);
  const db = useDatabase();

  useEffect(() => {
    let cancelled = false;
    const startRevision = selectionRevisionRef.current;

    const loadInitialCharacter = async () => {
      try {
        const resolved = await resolveOrSeedInitialCharacter(
          db,
          readStoredCharacterId(),
        );
        if (cancelled || selectionRevisionRef.current !== startRevision) {
          return;
        }
        if (resolved.shouldPersist) {
          persistCharacterId(resolved.id);
        }
        setState({
          status: "characterSelected",
          character: { id: resolved.id, name: resolved.name },
        });
      } catch (error) {
        if (cancelled || selectionRevisionRef.current !== startRevision) {
          return;
        }
        console.error(
          "[CharacterContext]: Error loading last used character",
          error,
        );
        setState({ status: "noCharacter" });
      }
    };

    void loadInitialCharacter();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const selectCharacter = useCallback((character: SelectedCharacter) => {
    selectionRevisionRef.current += 1;
    setState({ status: "characterSelected", character });
    persistCharacterId(character.id);
  }, []);

  const clearCharacter = useCallback(() => {
    selectionRevisionRef.current += 1;
    setState({ status: "noCharacter" });
    persistCharacterId(null);
  }, []);

  const value = useMemo(
    () => ({ state, selectCharacter, clearCharacter }),
    [state, selectCharacter, clearCharacter],
  );

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacterContext = () => {
  const context = useContext(CharacterContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a character provider");
  }
  return context;
};

export const useSelectedCharacter = (): SelectedCharacter => {
  const { state } = useCharacterContext();

  if (state.status !== "characterSelected") {
    throw new Error("A character must be selected to render this screen");
  }
  return state.character;
};
