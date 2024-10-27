import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';

export const characters = sqliteTable('characters', {
  character_id: integer('character_id').primaryKey(),
  name: text('name').notNull(),
  copper: integer('copper').default(0),
  silver: integer('silver').default(0),
  gold: integer('gold').default(0),
  platinum: integer('platinum').default(0),
  max_encumbrance: integer('max_encumbrance').notNull(),
});

export const items = sqliteTable('items', {
  item_id: integer('item_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  item_type: text('item_type').notNull(), // e.g., stable, consumable
  weight: integer('weight').notNull(),
  rarity: text('rarity'),
  properties: json('properties'), // JSON for flexible item properties
  container_id: integer('container_id'), // Links to the container
  character_id: integer('character_id').notNull(), // Owner of the item
  quantity: integer('quantity').default(1), // Useful for consumables
});

export const storageLocations = sqliteTable('storage_locations', {
  storage_location_id: integer('storage_location_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  weight: integer('weight').notNull(), // Dynamic weight
  fixed_weight: integer('fixed_weight'), // Specific weight if applicable
  is_fixed_weight: boolean('is_fixed_weight').default(false), // TRUE if weight is constant
  rarity: text('rarity'),
  properties: json('properties'), // JSON for flexible container properties
  character_id: integer('character_id').notNull(), // Owner of the container
  parent_location_id: integer('parent_location_id'), // For nested containers
});

export const transactions = sqliteTable('transactions', {
  transaction_id: integer('transaction_id').primaryKey(),
  message: text('message').notNull(), // e.g., "Used a potion of healing"
  character_id: integer('character_id').notNull(), // Who made the transaction
  created_at: timestamp('created_at').defaultNow(), // When the transaction occurred
  involved_money: boolean('involved_money').default(false), // Boolean to check if money was involved
});
