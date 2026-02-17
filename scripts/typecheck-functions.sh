#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FUNCTION_TS_FILES=()
while IFS= read -r file; do
  FUNCTION_TS_FILES+=("$file")
done < <(find supabase/functions -type f -name '*.ts' | sort)

if [ "${#FUNCTION_TS_FILES[@]}" -eq 0 ]; then
  echo "No Supabase function TypeScript files found."
  exit 0
fi

deno check --lock=deno.lock "${FUNCTION_TS_FILES[@]}"
