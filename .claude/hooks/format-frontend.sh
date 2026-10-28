#!/usr/bin/env bash
# PostToolUse hook: formatea con Prettier los archivos de frontend/ que Claude edita.
set -u

file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')
frontend="${CLAUDE_PROJECT_DIR:-$(pwd)}/frontend"

[[ -n "$file" && -f "$file" && "$file" == "$frontend"/* ]] || exit 0
[[ "$file" =~ \.(ts|tsx|js|jsx|json|css|html|md)$ ]] || exit 0

cd "$frontend" && npx --no-install prettier --write --ignore-unknown --log-level warn "$file" >&2 \
  || echo "format-frontend: prettier falló en $file" >&2
exit 0
