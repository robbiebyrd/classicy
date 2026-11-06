#!/bin/bash
set -euo pipefail
# Platinum's sound packs live in its package (plan 0015-kxa §3.3); the core
# ships no sprites. Each <dir>/<name>/sprites/*.<ext> becomes <name>.<format>
# and <name>.json beside it.
dir=${1:-./packages/appearance/platinum/src/assets/sounds}
outputDir=${2:-./packages/appearance/platinum/src/assets/sounds}
fileExt=${3:-mp3}
formats=${4:-ogg,m4a,mp3,ac3}
loops=${5:-ClassicyWindowMoveMoving,ClassicyWindowMoveIdle,ClassicyWindowResizeIdle,ClassicyWindowResizeResizing}

# audiosprite is a pinned devDependency (no network at build time). The
# override is for tests, which stand in for it.
audiosprite_bin=${AUDIOSPRITE_BIN:-./node_modules/.bin/audiosprite}

# Two guards keep an unchanged sound from shipping new sprite bytes (each new
# byte would be a new sprite URL on every deploy):
#
# 1. Encoding is deterministic. ffmpeg writes a random Ogg stream serial
#    number into platinum.ogg (and encoder tags into the other formats) unless
#    it is told to be bit-exact. audiosprite cannot pass ffmpeg flags, so an
#    `ffmpeg` shim first on PATH adds them to the encode call (the one that
#    starts with `-y`), just before its output file. Any ffmpeg takes the flags.
# 2. Encoding is skipped when nothing changed. <name>.sprites.sha256 holds a
#    hash of the source files, this script and the audiosprite version; when it
#    matches and every output exists, the pack is left alone. The ffmpeg
#    version is left out on purpose: a distro ffmpeg and mise's encode the same
#    sources to different bytes, and the committed sprites must stay put across
#    them. CLASSICY_AUDIO_FORCE=1 encodes anyway.

if command -v sha256sum > /dev/null; then
	sha256() { sha256sum | cut -d' ' -f1; }
else
	sha256() { shasum -a 256 | cut -d' ' -f1; }
fi

# Hash of everything that decides a pack's bytes except the ffmpeg build.
pack_hash() {
	local pack=$1 f version
	version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$(dirname "${audiosprite_bin}")/../audiosprite/package.json" 2> /dev/null | head -n1 || true)
	{
		printf 'audiosprite %s\nformats %s\nloops %s\n' "${version}" "${formats}" "${loops}"
		sha256 < "${BASH_SOURCE[0]}"
		for f in "${pack}"/sprites/*."${fileExt}"; do
			printf '%s %s\n' "${f##*/}" "$(sha256 < "${f}")"
		done
	} | sha256
}

pack_outputs_exist() {
	local base=$1 ext
	[[ -f "${base}.json" ]] || return 1
	IFS=',' read -ra exts <<< "${formats}"
	for ext in "${exts[@]}"; do
		[[ -f "${base}.${ext}" ]] || return 1
	done
}

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

# The bit-exact ffmpeg shim (a scratch directory of our own, removed on exit).
real_ffmpeg=$(command -v ffmpeg || true)
shim_dir=$(mktemp -d)
trap '[[ -n "${shim_dir}" ]] && rm -rf "${shim_dir}"' EXIT
cat > "${shim_dir}/ffmpeg" << SHIM
#!/bin/bash
if [[ "\${1:-}" == "-y" ]]; then
	args=("\$@")
	last=\$(( \${#args[@]} - 1 ))
	exec "${real_ffmpeg}" "\${args[@]:0:last}" -fflags +bitexact -map_metadata -1 "\${args[last]}"
fi
exec "${real_ffmpeg}" "\$@"
SHIM
chmod +x "${shim_dir}/ffmpeg"

for eachDir in "${dir}"/*/; do
	eachDir=${eachDir%*/}
	name=${eachDir##*/}
	base="${outputDir}/${name}/${name}"
	stamp="${base}.sprites.sha256"
	hash=$(pack_hash "${dir}/${name}")
	if [[ -z "${CLASSICY_AUDIO_FORCE:-}" && -f "${stamp}" && "$(cat "${stamp}")" == "${hash}" ]] && pack_outputs_exist "${base}"; then
		echo "audio: ${name} is up to date"
		continue
	fi
	PATH="${shim_dir}:${PATH}" "${audiosprite_bin}" -f howler2 -o "${base}" -e "${formats}" "${loop_args[@]}" "${dir}/${name}/sprites/*.${fileExt}"
	normalize_sprite_json "${base}.json"
	printf '%s\n' "${hash}" > "${stamp}"
done
