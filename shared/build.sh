#!/bin/sh

# Ensure dist directory exists
mkdir -p dist

# Copy all TypeScript files to dist with .ts extension
find src -type f -name "*.ts" | while read -r file; do
  rel_path="${file#src/}"
  mkdir -p "dist/$(dirname "$rel_path")"
  cp "$file" "dist/${rel_path}"
  echo "Copied $file to dist/${rel_path}"
done

echo "Build completed successfully!"
