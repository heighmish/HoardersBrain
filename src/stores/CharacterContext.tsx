import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { findActiveCharacterById } from "@/db/repositories/characters";
import { loadSampleData } from "@/db/sampleData";
import { charactersTable } from "@/db/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { asc, isNull } from "drizzle-orm";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

interface CharacterContextProps {
  children: ReactNode;
}

export const CharacterProvider: React.FC<CharacterContextProps> = ({
  children,
}) => {
  const [state, setState] = useState<CharacterSelectionState>({
    status: "loading",
  });

  const db = useDatabase();

  useEffect(() => {
    const loadLastCharacter = async () => {
      let storedId: string | null = null;
      try {
        storedId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
      } catch (error) {
        console.error(
          "[CharacterContext]: Error reading last used character id",
          error,
        );
      }

      try {
        const charId = storedId === null ? null : Number.parseInt(storedId, 10);

        if (charId !== null && Number.isInteger(charId)) {
          const character = await findActiveCharacterById(db, charId);
          if (character !== undefined) {
            setState({
              status: "characterSelected",
              character: {
                id: character.character_id,
                name: character.name,
              },
            });
            return;
          }
        }

        const fallbackCharacter = await db.query.charactersTable.findFirst({
          where: isNull(charactersTable.deleted_at),
          orderBy: asc(charactersTable.character_id),
        });

        if (fallbackCharacter !== undefined) {
          AsyncStorage.setItem(
            LAST_CHARACTER_ID,
            String(fallbackCharacter.character_id),
          ).catch(console.error);
          setState({
            status: "characterSelected",
            character: {
              id: fallbackCharacter.character_id,
              name: fallbackCharacter.name,
            },
          });
          return;
        }

        const sampleCharacter = await loadSampleData(db);
        AsyncStorage.setItem(
          LAST_CHARACTER_ID,
          String(sampleCharacter.id),
        ).catch(console.error);
        setState({
          status: "characterSelected",
          character: {
            id: sampleCharacter.id,
            name: sampleCharacter.name,
          },
        });
      } catch (error) {
        console.error(
          "[CharacterContext]: Error loading last used character",
          error,
        );
        setState({ status: "noCharacter" });
      }
    };
    loadLastCharacter();
  }, [db]);

  const selectCharacter = useCallback((character: SelectedCharacter) => {
    setState({ status: "characterSelected", character });
    AsyncStorage.setItem(LAST_CHARACTER_ID, String(character.id)).catch(
      console.error,
    );
  }, []);

  const clearCharacter = useCallback(() => {
    setState({ status: "noCharacter" });
    AsyncStorage.removeItem(LAST_CHARACTER_ID).catch(console.error);
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
