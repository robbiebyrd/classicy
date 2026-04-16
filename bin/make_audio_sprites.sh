#!/bin/bash
set -euo pipefail
dir=${1:-./assets/sounds}
outputDir=${2:-./assets/sounds}
outputPath=${2:-/assets/sounds}
fileExt=${3:-mp3}
formats=${4:-ogg,m4a,mp3,ac3}
loops=${5:-ClassicyWindowMoveMoving,ClassicyWindowMoveIdle,ClassicyWindowResizeIdle,ClassicyWindowResizeResizing}

loop_args=()
IFS=',' read -ra loop_items <<< "${loops}"
for item in "${loop_items[@]}"; do
	[[ -n "${item}" ]] && loop_args+=(--loop "${item}")
done

for eachDir in "${dir}"/*/; do
	eachDir=${eachDir%*/}
	npx -y audiosprite -f howler2 -o "${outputDir}/${eachDir##*/}/${eachDir##*/}" -e "${formats}" -u "${outputPath}/${eachDir##*/}" "${loop_args[@]}" "${dir}/${eachDir##*/}/sprites/*.${fileExt}"
done
