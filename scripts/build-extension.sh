#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
package_dir="$repo_root/dist/v2-extension"
zip_path="$repo_root/dist/v2-extension-1.1.1.zip"

rm -rf "$package_dir"
rm -f "$zip_path"
mkdir -p "$package_dir/assets" "$package_dir/src" "$repo_root/dist"

cp "$repo_root/manifest.json" "$package_dir/"
cp "$repo_root/background.js" "$package_dir/"
cp "$repo_root/index.html" "$package_dir/"
cp "$repo_root/harmony.png" "$package_dir/"
cp -R "$repo_root/assets/icons" "$package_dir/assets/"
cp -R "$repo_root/src/data" "$package_dir/src/"
cp -R "$repo_root/src/popup" "$package_dir/src/"
cp -R "$repo_root/src/settings" "$package_dir/src/"
cp -R "$repo_root/src/utils" "$package_dir/src/"

find "$package_dir" -name '.DS_Store' -delete

(
  cd "$package_dir"
  zip -qr "$zip_path" .
)

echo "Created $zip_path"
