PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_storage_locations` (
	`storage_location_id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` integer NOT NULL,
	`is_fixed_weight` integer DEFAULT false,
	`carrying` integer DEFAULT false,
	`rarity` text NOT NULL,
	`properties` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_storage_locations`("storage_location_id", "character_id", "name", "description", "weight", "is_fixed_weight", "carrying", "rarity", "properties") SELECT "storage_location_id", "character_id", "name", "description", "weight", "is_fixed_weight", "carrying", "rarity", "properties" FROM `storage_locations`;--> statement-breakpoint
DROP TABLE `storage_locations`;--> statement-breakpoint
ALTER TABLE `__new_storage_locations` RENAME TO `storage_locations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_storage_char` ON `storage_locations` (`character_id`);