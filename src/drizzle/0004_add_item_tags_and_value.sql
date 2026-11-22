CREATE TABLE `tags` (
	`tag_id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`parent_tag_id` integer,
	`is_usable` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_tag_id`) REFERENCES `tags`(`tag_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tags_no_self_parent" CHECK("tags"."parent_tag_id" IS NULL OR "tags"."parent_tag_id" != "tags"."tag_id")
);
--> statement-breakpoint
CREATE INDEX `idx_tags_char` ON `tags` (`character_id`);--> statement-breakpoint
CREATE INDEX `idx_tags_parent` ON `tags` (`parent_tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tags_char_name_active` ON `tags` (`character_id`,lower("name")) WHERE "tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`item_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`tag_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_item_tags_tag_item` ON `item_tags` (`tag_id`,`item_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_items` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`storage_location_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`item_type` text NOT NULL,
	`weight` real NOT NULL,
	`rarity` text DEFAULT 'Common' NOT NULL,
	`properties` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`value` real,
	`value_currency` text,
	`deleted_at` integer,
	FOREIGN KEY (`storage_location_id`) REFERENCES `storage_locations`(`storage_location_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "items_weight_nonnegative" CHECK("__new_items"."weight" >= 0),
	CONSTRAINT "items_value_nonnegative" CHECK("__new_items"."value" IS NULL OR "__new_items"."value" >= 0),
	CONSTRAINT "items_rarity_valid" CHECK("__new_items"."rarity" IN ('Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'))
);
--> statement-breakpoint
INSERT INTO `__new_items`("item_id", "storage_location_id", "character_id", "name", "description", "item_type", "weight", "rarity", "properties", "quantity", "value", "value_currency", "deleted_at") SELECT "item_id", "storage_location_id", "character_id", "name", "description", "item_type", "weight", "rarity", "properties", "quantity", NULL, NULL, "deleted_at" FROM `items`;--> statement-breakpoint
DROP TABLE `items`;--> statement-breakpoint
ALTER TABLE `__new_items` RENAME TO `items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_items_char_storage` ON `items` (`character_id`,`storage_location_id`);