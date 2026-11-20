CREATE TABLE `characters` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`copper` integer DEFAULT 0 NOT NULL,
	`silver` integer DEFAULT 0 NOT NULL,
	`gold` integer DEFAULT 0 NOT NULL,
	`platinum` integer DEFAULT 0 NOT NULL,
	`max_encumbrance` integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
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
	FOREIGN KEY (`storage_location_id`) REFERENCES `storage_locations`(`storage_location_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "items_weight_nonnegative" CHECK("items"."weight" >= 0),
	CONSTRAINT "items_rarity_valid" CHECK("items"."rarity" IN ('Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'))
);
--> statement-breakpoint
CREATE INDEX `idx_items_char_storage` ON `items` (`character_id`,`storage_location_id`);--> statement-breakpoint
CREATE TABLE `ledger` (
	`ledger_id` integer PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`character_id` integer,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `storage_locations` (
	`storage_location_id` integer PRIMARY KEY NOT NULL,
	`character_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` real NOT NULL,
	`is_fixed_weight` integer DEFAULT false NOT NULL,
	`carrying` integer DEFAULT false NOT NULL,
	`rarity` text DEFAULT 'Common' NOT NULL,
	`properties` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "storage_weight_nonnegative" CHECK("storage_locations"."weight" >= 0),
	CONSTRAINT "storage_rarity_valid" CHECK("storage_locations"."rarity" IN ('Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'))
);
--> statement-breakpoint
CREATE INDEX `idx_storage_char` ON `storage_locations` (`character_id`);