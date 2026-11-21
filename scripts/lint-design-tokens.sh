#!/usr/bin/env bash
set -euo pipefail

status=0

hex_violations=$(grep -rnE "#[0-9a-fA-F]{3,8}\b" src/app src/components || true)
if [ -n "$hex_violations" ]; then
  echo "Raw hex color literals in src/app or src/components:"
  echo "$hex_violations"
  echo "Hex values live only in src/constants/theme.ts, src/constants/themePresets.ts, and src/constants/rarity.ts. Use useTheme() colors. See TOKENS.md."
  status=1
fi

fontsize_violations=$(grep -rnE "fontSize: *[0-9]" src/app src/components || true)
if [ -n "$fontsize_violations" ]; then
  echo "Raw fontSize literals in src/app or src/components:"
  echo "$fontsize_violations"
  echo "Typography comes from theme.type.* via useTheme() — the type ramp owns font sizes. See TOKENS.md."
  status=1
fi

exit $status
