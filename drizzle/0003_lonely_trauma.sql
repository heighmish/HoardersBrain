PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_items` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`container_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`item_type` text NOT NULL,
	`weight` integer NOT NULL,
	`rarity` text DEFAULT 'Common' NOT NULL,
	`properties` text,
	`quantity` integer DEFAULT 1,
	FOREIGN KEY (`container_id`) REFERENCES `storage_locations`(`storage_location_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_items`("item_id", "container_id", "character_id", "name", "description", "item_type", "weight", "rarity", "properties", "quantity") SELECT "item_id", "container_id", "character_id", "name", "description", "item_type", "weight", "rarity", "properties", "quantity" FROM `items`;--> statement-breakpoint
DROP TABLE `items`;--> statement-breakpoint
ALTER TABLE `__new_items` RENAME TO `items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_items_char_storage` ON `items` (`character_id`,`container_id`);--> statement-breakpoint
CREATE TABLE `__new_storage_locations` (
	`storage_location_id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` integer NOT NULL,
	`is_fixed_weight` integer DEFAULT false,
	`carrying` integer DEFAULT false,
	`rarity` text DEFAULT 'Common' NOT NULL,
	`properties` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_storage_locations`("storage_location_id", "character_id", "name", "description", "weight", "is_fixed_weight", "carrying", "rarity", "properties") SELECT "storage_location_id", "character_id", "name", "description", "weight", "is_fixed_weight", "carrying", "rarity", "properties" FROM `storage_locations`;--> statement-breakpoint
DROP TABLE `storage_locations`;--> statement-breakpoint
ALTER TABLE `__new_storage_locations` RENAME TO `storage_locations`;--> statement-breakpoint
CREATE INDEX `idx_storage_char` ON `storage_locations` (`character_id`);