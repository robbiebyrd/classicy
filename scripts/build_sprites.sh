dir=${1:-./resources/sounds}
outputDir=${2:-./assets/sounds}
outputPath=${2:-/assets/sounds}
distLocation=${2:-dist/assets/sounds}
fileExt=${3:-mp3}
formats=${4:-ogg,m4a,mp3,ac3}

for eachDir in ${dir}/*/
do
    eachDir=${eachDir%*/}
    npx -y audiosprite -f howler2 -o "${outputDir}/${eachDir##*/}/${eachDir##*/}" -e "${formats}" "${dir}/${eachDir##*/}/*.${fileExt}"  -u "${outputPath}/${eachDir##*/}"
done

mkdir -p "${distLocation}"
cp -r "${outputDir}/" "./${distLocation}"
