ALTER TABLE `characters` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `items` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `storage_locations` ADD `deleted_at` integer;