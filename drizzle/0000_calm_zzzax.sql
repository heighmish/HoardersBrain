CREATE TABLE `characters` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`copper` integer DEFAULT 0 NOT NULL,
	`silver` integer DEFAULT 0 NOT NULL,
	`gold` integer DEFAULT 0 NOT NULL,
	`platinum` integer DEFAULT 0 NOT NULL,
	`max_encumbrance` integer DEFAULT 100 NOT NULL
);
CREATE TABLE `items` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`container_id` integer,
	`character_id` integer,
	`name` text NOT NULL,
	`description` text,
	`item_type` text NOT NULL,
	`weight` integer NOT NULL,
	`rarity` text NOT NULL,
	`properties` text,
	`quantity` integer DEFAULT 1,
	FOREIGN KEY (`container_id`) REFERENCES `storage_locations`(`storage_location_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`character_id` integer,
	`name` text NOT NULL,
	`description` text,
	`weight` integer NOT NULL,
	`is_fixed_weight` integer DEFAULT false,
	`rarity` text NOT NULL,
	`properties` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`character_id`) ON UPDATE no action ON DELETE no action
);
