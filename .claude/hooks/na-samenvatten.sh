#!/usr/bin/env bash
# SessionStart (matcher compact): zet na het samenvatten de bovenste stand van de overdracht
# terug in de context. Alleen de eerste sectie "## Stand ...", hoogstens 8000 tekens.
f="${CLAUDE_PROJECT_DIR:-.}/.claude/coordinator/overdracht.md"
[ -f "$f" ] || exit 0
echo "Na het samenvatten: werk eerst .claude/coordinator/overdracht.md bij met wat de samenvatting noemt en daar nog niet staat. De huidige stand uit de overdracht:"
echo
awk '/^## Stand/{n++} n==1{print} n>1{exit}' "$f" | head -c 8000
