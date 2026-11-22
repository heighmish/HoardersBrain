import { Rarity } from "@/constants/databaseTypes";
import type { CoinDenomination } from "@/utils/currency";
import { sql } from "drizzle-orm/sql";
import {
  AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const charactersTable = sqliteTable("characters", {
  character_id: integer("character_id").primaryKey(),
  name: text("name").notNull(),
  copper: integer("copper").default(0).notNull(),
  silver: integer("silver").default(0).notNull(),
  gold: integer("gold").default(0).notNull(),
  platinum: integer("platinum").default(0).notNull(),
  max_encumbrance: integer("max_encumbrance").default(100).notNull(),
  weight_tracking: integer("weight_tracking", { mode: "boolean" })
    .default(true)
    .notNull(),
  deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const itemsTable = sqliteTable(
  "items",
  {
    item_id: integer("item_id").primaryKey(),
    storage_location_id: integer("storage_location_id")
      .references(() => storageLocationsTable.storage_location_id)
      .notNull(),
    character_id: integer("character_id")
      .references(() => charactersTable.character_id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    item_type: text("item_type").notNull(),
    weight: real("weight").notNull(),
    rarity: text("rarity").$type<Rarity>().notNull().default("Common"),
    properties: text("properties", { mode: "json" }),
    quantity: integer("quantity").default(1).notNull(),
    value: real("value"),
    value_currency: text("value_currency").$type<CoinDenomination>(),
    deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_items_char_storage").on(
      table.character_id,
      table.storage_location_id,
    ),
    check("items_weight_nonnegative", sql`${table.weight} >= 0`),
    check(
      "items_value_nonnegative",
      sql`${table.value} IS NULL OR ${table.value} >= 0`,
    ),
    check(
      "items_rarity_valid",
      sql`${table.rarity} IN ('Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary')`,
    ),
  ],
);

export const storageLocationsTable = sqliteTable(
  "storage_locations",
  {
    storage_location_id: integer("storage_location_id").primaryKey(),
    character_id: integer("character_id")
      .references(() => charactersTable.character_id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    weight: real("weight").notNull(),
    is_fixed_weight: integer("is_fixed_weight", {
      mode: "boolean",
    })
      .default(false)
      .notNull(),
    carrying: integer("carrying", { mode: "boolean" }).default(false).notNull(),
    rarity: text("rarity").$type<Rarity>().notNull().default("Common"),
    properties: text("properties", { mode: "json" }),
    deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_storage_char").on(table.character_id),
    check("storage_weight_nonnegative", sql`${table.weight} >= 0`),
    check(
      "storage_rarity_valid",
      sql`${table.rarity} IN ('Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary')`,
    ),
  ],
);

export const ledgerTable = sqliteTable("ledger", {
  ledger_id: integer("ledger_id").primaryKey(),
  message: text("message").notNull(),
  character_id: integer("character_id").references(
    () => charactersTable.character_id,
  ),
  timestamp: text().default(sql`(CURRENT_TIMESTAMP)`),
});

export const tagsTable = sqliteTable(
  "tags",
  {
    tag_id: integer("tag_id").primaryKey(),
    // Null character_id denotes a global tag shared across all characters.
    character_id: integer("character_id").references(
      () => charactersTable.character_id,
    ),
    name: text("name").notNull(),
    parent_tag_id: integer("parent_tag_id").references(
      (): AnySQLiteColumn => tagsTable.tag_id,
    ),
    is_usable: integer("is_usable", { mode: "boolean" })
      .default(false)
      .notNull(),
    sort_order: integer("sort_order").default(0).notNull(),
    deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_tags_char").on(table.character_id),
    index("idx_tags_parent").on(table.parent_tag_id),
    uniqueIndex("uq_tags_char_name_active")
      .on(table.character_id, sql`lower(${table.name})`)
      .where(sql`${table.character_id} IS NOT NULL AND ${table.deleted_at} IS NULL`),
    uniqueIndex("uq_tags_global_name_active")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.character_id} IS NULL AND ${table.deleted_at} IS NULL`),
    check(
      "tags_no_self_parent",
      sql`${table.parent_tag_id} IS NULL OR ${table.parent_tag_id} != ${table.tag_id}`,
    ),
  ],
);

export const itemTagsTable = sqliteTable(
  "item_tags",
  {
    item_id: integer("item_id")
      .references(() => itemsTable.item_id)
      .notNull(),
    tag_id: integer("tag_id")
      .references(() => tagsTable.tag_id)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.item_id, table.tag_id] }),
    index("idx_item_tags_tag_item").on(table.tag_id, table.item_id),
  ],
);

export type Character = typeof charactersTable.$inferSelect;
export type Storage = typeof storageLocationsTable.$inferSelect;
export type Item = typeof itemsTable.$inferSelect;
export type Ledger = typeof ledgerTable.$inferSelect;
export type Tag = typeof tagsTable.$inferSelect;
export type ItemTag = typeof itemTagsTable.$inferSelect;

export const schema = {
  charactersTable,
  itemsTable,
  storageLocationsTable,
  ledgerTable,
  tagsTable,
  itemTagsTable,
};
