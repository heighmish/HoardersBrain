// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_unusual_paladin.sql';
import m0001 from './0001_nervous_sabretooth.sql';
import m0002 from './0002_cloudy_monster_badoon.sql';
import m0003 from './0003_on_person_not_fixed.sql';
import m0004 from './0004_add_item_tags_and_value.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  