#!/usr/bin/env bash

set -euo pipefail

while IFS= read -r -d '' doc_path; do
  gh issue create \
    --title "docs: review $doc_path" \
    --body "Review \`$doc_path\` and confirm that its content is accurate and up to date."
done < <(git ls-files -z -- '*.md')
