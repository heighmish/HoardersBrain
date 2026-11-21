import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { and, eq, isNull } from "drizzle-orm";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
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
      try {
        const storedId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        const charId = storedId === null ? null : Number.parseInt(storedId, 10);

        if (charId !== null && Number.isInteger(charId)) {
          const character = await db.query.charactersTable.findFirst({
            where: and(
              eq(charactersTable.character_id, charId),
              isNull(charactersTable.deleted_at),
            ),
          });
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

        if (storedId !== null) {
          await AsyncStorage.removeItem(LAST_CHARACTER_ID);
        }
        setState({ status: "noCharacter" });
      } catch (error) {
        console.error(
          "[CharacterContext]: Error loading last used character id",
          error,
        );
        setState({ status: "noCharacter" });
      }
    };
    loadLastCharacter();
  }, [db]);

  const selectCharacter = (character: SelectedCharacter) => {
    setState({ status: "characterSelected", character });
  };

  const clearCharacter = () => {
    setState({ status: "noCharacter" });
  };

  return (
    <CharacterContext.Provider
      value={{ state, selectCharacter, clearCharacter }}
    >
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
