import { ReactNode, createContext, useContext, useState } from "react";

type Character = {
  name: string;
  id: number;
};

type CharacterContextType = {
  character: Character;
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
  const [selectedCharacter, setSelectedCharacter] = useState<Character>({
    name: "",
    id: -1,
  });

  console.log(selectedCharacter);

  return (
    <CharacterContext.Provider
      value={{
        character: {
          name: selectedCharacter.name,
          id: selectedCharacter.id,
        },
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
