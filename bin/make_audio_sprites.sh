#!/bin/bash
dir=${1:-./resources/sounds}
outputDir=${2:-./public/sounds}
outputPath=${2:-/sounds}
fileExt=${3:-mp3}
formats=${4:-ogg,m4a,mp3,ac3}

for eachDir in "${dir}"/*/; do
	eachDir=${eachDir%*/}
	npx -y audiosprite -f howler2 -o "${outputDir}/${eachDir##*/}/${eachDir##*/}" -e "${formats}" -u "${outputPath}/${eachDir##*/}" "${dir}/${eachDir##*/}/*.${fileExt}"
done
