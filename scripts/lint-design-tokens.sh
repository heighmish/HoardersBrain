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

spacing_violations=$(grep -rnE "(padding|margin|gap)[A-Za-z]*: *-?(4|8|16|24|32|48)\b" src/app src/components || true)
if [ -n "$spacing_violations" ]; then
  echo "Spacing-scale literals in src/app or src/components:"
  echo "$spacing_violations"
  echo "A value that is already a spacing step must use theme.spacing.*; only genuinely off-grid values may stay inline, with a comment. See TOKENS.md."
  status=1
fi

textinput_violations=$(grep -rnE "\bTextInput\b" src/app src/components \
  | grep -vE '^src/components/Basic/(Input|NumericInput)\.tsx:' || true)
if [ -n "$textinput_violations" ]; then
  echo "Raw TextInput imports or usage in src/app or src/components:"
  echo "$textinput_violations"
  echo "Use the Input or NumericInput primitive instead of hand-rolling a TextInput. See TOKENS.md."
  status=1
fi

exit $status
