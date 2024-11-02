import { sql } from "drizzle-orm/sql";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const charactersTable = sqliteTable("characters", {
  character_id: integer("character_id").primaryKey(),
  name: text("name").notNull(),
  copper: integer("copper").default(0).notNull(),
  silver: integer("silver").default(0).notNull(),
  gold: integer("gold").default(0).notNull(),
  platinum: integer("platinum").default(0).notNull(),
  max_encumbrance: integer("max_encumbrance").default(100).notNull(),
});

export const itemsTable = sqliteTable("items", {
  item_id: integer("item_id").primaryKey(),
  storage_location_id: integer("container_id")
    .references(() => storageLocationsTable.storage_location_id)
    .notNull(),
  character_id: integer("character_id")
    .references(() => charactersTable.character_id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  item_type: text("item_type").notNull(),
  weight: integer("weight").notNull(),
  rarity: text("rarity").notNull(),
  properties: text("properties", { mode: "json" }),
  quantity: integer("quantity").default(1),
});

export const storageLocationsTable = sqliteTable("storage_locations", {
  storage_location_id: integer("storage_location_id").primaryKey(),
  character_id: integer("character_id")
    .references(() => charactersTable.character_id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").notNull(),
  is_fixed_weight: integer("is_fixed_weight", {
    mode: "boolean",
  }).default(false),
  rarity: text("rarity").notNull(),
  properties: text("properties", { mode: "json" }),
});

export const ledger = sqliteTable("ledger", {
  ledger_id: integer("ledger_id").primaryKey(),
  message: text("message").notNull(),
  character_id: integer("character_id").references(
    () => charactersTable.character_id,
  ),
  timestamp: text().default(sql`(CURRENT_TIMESTAMP)`),
});

export type Character = typeof charactersTable.$inferSelect;
export type Storage = typeof storageLocationsTable.$inferSelect;
export type Item = typeof itemsTable.$inferSelect;

export const schema = {
  charactersTable,
  itemsTable,
  storageLocationsTable,
};
