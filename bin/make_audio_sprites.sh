#!/bin/bash
set -euo pipefail
dir=${1:-./assets/sounds}
outputDir=${2:-./assets/sounds}
fileExt=${3:-mp3}
formats=${4:-ogg,m4a,mp3,ac3}
loops=${5:-ClassicyWindowMoveMoving,ClassicyWindowMoveIdle,ClassicyWindowResizeIdle,ClassicyWindowResizeResizing}

# Rewrite an audiosprite JSON in place: id, name and relative src, then sprite.
normalize_sprite_json() {
	node -e '
const fs = require("node:fs");
const path = require("node:path");
const file = process.argv[1];
const id = path.basename(path.dirname(file));
const json = JSON.parse(fs.readFileSync(file, "utf8"));
const out = {
	id,
	name: id.charAt(0).toUpperCase() + id.slice(1),
	src: json.src.map((s) => "./" + path.basename(s)),
	sprite: json.sprite,
};
fs.writeFileSync(file, JSON.stringify(out, null, "\t") + "\n");
' "$1"
}

loop_args=()
IFS=',' read -ra loop_items <<< "${loops}"
for item in "${loop_items[@]}"; do
	[[ -n "${item}" ]] && loop_args+=(--loop "${item}")
done

for eachDir in "${dir}"/*/; do
	eachDir=${eachDir%*/}
	npx -y audiosprite -f howler2 -o "${outputDir}/${eachDir##*/}/${eachDir##*/}" -e "${formats}" "${loop_args[@]}" "${dir}/${eachDir##*/}/sprites/*.${fileExt}"
	normalize_sprite_json "${outputDir}/${eachDir##*/}/${eachDir##*/}.json"
done
