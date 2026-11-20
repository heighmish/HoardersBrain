import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export const DEFAULT_ID = -1;
export const DEFAULT_NAME = "";

export const DEFAULT_CHARACTER: Character = {
  name: DEFAULT_NAME,
  id: DEFAULT_ID,
};

type Character = {
  name: string;
  id: number;
};

type CharacterContextType = {
  character: Character;
  isLoaded: boolean;
  updateCharacter: (character: Character) => void;
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
  const [selectedCharacter, setSelectedCharacter] =
    useState<Character>(DEFAULT_CHARACTER);
  const [isLoaded, setIsLoaded] = useState(false);

  const db = useDatabase();

  useEffect(() => {
    const loadLastCharacter = async () => {
      try {
        const charId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        if (charId !== null) {
          const character = await db.query.charactersTable.findFirst({
            where: eq(charactersTable.character_id, Number(charId)),
          });
          if (character !== undefined) {
            setSelectedCharacter({
              id: character.character_id,
              name: character.name,
            });
          }
        }
      } catch (error) {
        console.error(
          "[CharacterContext]: Error loading last used character id",
          error,
        );
      } finally {
        setIsLoaded(true);
      }
    };
    loadLastCharacter();
  }, [db]);

  return (
    <CharacterContext.Provider
      value={{
        character: {
          name: selectedCharacter.name,
          id: selectedCharacter.id,
        },
        isLoaded: isLoaded,
        updateCharacter: setSelectedCharacter,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacterContext = () => {
  const context = useContext(CharacterContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a database provider");
  }
  return context;
};
