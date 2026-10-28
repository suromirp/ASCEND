#!/bin/bash
# Blokkeert `git commit` als lint of tests falen, zodra er code is aangepast.
# Alleen documentatie en configuratie: geen controle nodig.
input=$(cat)
case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# In de map waar de commit gebeurt (een worktree van een helper), niet altijd de hoofdmap.
dir=$(printf '%s' "$input" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("cwd",""))
except Exception: print("")' 2>/dev/null)
cd "${dir:-${CLAUDE_PROJECT_DIR:-.}}" 2>/dev/null || cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0

# Zonder geinstalleerde pakketten kunnen we niet controleren: niet blokkeren.
[ -d node_modules ] || [ -d "${CLAUDE_PROJECT_DIR:-.}/node_modules" ] || exit 0
[ -d node_modules ] || ln -s "${CLAUDE_PROJECT_DIR}/node_modules" node_modules 2>/dev/null

# Staged and unstaged together: the hook runs before the command, so in
# "git add ... && git commit" nothing is staged yet when it looks.
if ! { git diff --cached --name-only; git diff --name-only; git ls-files --others --exclude-standard; } | grep -qE '^(src/|package(-lock)?\.json$|vite\.config|vitest\.config|tsconfig)'; then
  exit 0
fi

if ! npx tsc -p tsconfig.app.json --noEmit >&2; then
  echo "Commit geblokkeerd: de typecontrole is rood." >&2
  exit 2
fi
if ! npm run lint >&2; then
  echo "Commit geblokkeerd: lint is rood. Herstel eerst de meldingen." >&2
  exit 2
fi
if ! npx vitest run >&2; then
  echo "Commit geblokkeerd: tests zijn rood. Herstel eerst de tests." >&2
  exit 2
fi
exit 0
