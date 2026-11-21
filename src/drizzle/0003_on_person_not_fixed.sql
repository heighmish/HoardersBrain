-- "On Person" holds the character, it is not a container with a fixed total weight.
UPDATE `storage_locations` SET `is_fixed_weight` = 0 WHERE `carrying` = 1;
