#!/bin/bash
# Ensure the system libraries that ffmpeg links against are installed.
#
# Invoked by mise's `preinstall` hook, which fires on EVERY `mise install` --
# including runs that only touch node. So the already-satisfied path must be fast
# and must never invoke sudo.
#
# The package lists below must stay in sync with ASDF_FFMPEG_ENABLE in mise.toml:
# every --enable-* option there needs its development headers here.
#
# Usage:
#   ffmpeg-deps.sh            install whatever is missing
#   ffmpeg-deps.sh --check    report what is missing, install nothing
set -euo pipefail

# Debian/Ubuntu packages, in the same order as ASDF_FFMPEG_ENABLE.
APT_PACKAGES=(
	libaom-dev            # libaom
	libfontconfig-dev     # fontconfig
	libfreetype-dev       # libfreetype
	frei0r-plugins-dev    # frei0r
	libmp3lame-dev        # libmp3lame
	libass-dev            # libass
	libvorbis-dev         # libvorbis
	libvpx-dev            # libvpx
	libopus-dev           # libopus
	libsdl2-dev           # sdl2
	libsnappy-dev         # libsnappy
	libtheora-dev         # libtheora
	libx264-dev           # libx264
	libx265-dev           # libx265
	liblzma-dev           # lzma
	nasm                  # assembler, required by libaom/x264/x265
	yasm                  # assembler, required by older codec paths
)

# Homebrew formulae, same ordering.
BREW_FORMULAE=(
	aom
	fontconfig
	freetype
	frei0r
	lame
	libass
	libvorbis
	libvpx
	opus
	sdl2
	snappy
	theora
	x264
	x265
	xz
	nasm
	yasm
)

check_only=false
if [[ ${1:-} == "--check" ]]; then
	check_only=true
elif [[ -n ${1:-} ]]; then
	echo "ffmpeg-deps: unknown argument '${1}' (expected --check or nothing)" >&2
	exit 2
fi

missing=()

collect_missing_apt() {
	local pkg
	for pkg in "${APT_PACKAGES[@]}"; do
		if ! dpkg-query -W -f='${Status}' "${pkg}" 2>/dev/null | grep -q 'ok installed'; then
			missing+=("${pkg}")
		fi
	done
}

collect_missing_brew() {
	# One `brew list` call, not one per formula -- brew is slow to start up.
	local installed formula
	installed="$(brew list --formula 2>/dev/null || true)"
	for formula in "${BREW_FORMULAE[@]}"; do
		if ! printf '%s\n' "${installed}" | grep -qx "${formula}"; then
			missing+=("${formula}")
		fi
	done
}

# `${missing[@]+...}` guards against macOS's bash 3.2, where expanding an empty
# array under `set -u` is a fatal "unbound variable" error. That empty case is the
# common one here, so the guard is load-bearing, not defensive noise.
report_missing() {
	echo "ffmpeg-deps: missing ${#missing[@]} dependenc$([[ ${#missing[@]} -eq 1 ]] && echo y || echo ies):" >&2
	printf '  %s\n' ${missing[@]+"${missing[@]}"} >&2
}

case "$(uname -s)" in
Darwin)
	if ! command -v brew >/dev/null 2>&1; then
		echo "ffmpeg-deps: Homebrew is required to build ffmpeg on macOS." >&2
		echo "  Install it from https://brew.sh, then re-run 'mise install'." >&2
		exit 1
	fi

	collect_missing_brew

	if [[ ${#missing[@]} -eq 0 ]]; then
		"${check_only}" && echo "ffmpeg-deps: all dependencies satisfied."
		exit 0
	fi

	report_missing
	if "${check_only}"; then
		exit 1
	fi

	echo "ffmpeg-deps: running: brew install ${missing[*]}"
	brew install ${missing[@]+"${missing[@]}"}
	;;

Linux)
	if ! command -v dpkg-query >/dev/null 2>&1 || ! command -v apt-get >/dev/null 2>&1; then
		echo "ffmpeg-deps: this script only automates Debian/Ubuntu (apt) systems." >&2
		echo "  Install the equivalent of these development packages for your distro:" >&2
		printf '  %s\n' "${APT_PACKAGES[@]}" >&2
		echo "  See https://trac.ffmpeg.org/wiki/CompilationGuide for per-distro guidance." >&2
		exit 1
	fi

	collect_missing_apt

	if [[ ${#missing[@]} -eq 0 ]]; then
		"${check_only}" && echo "ffmpeg-deps: all dependencies satisfied."
		exit 0
	fi

	report_missing
	if "${check_only}"; then
		exit 1
	fi

	# Announce the command before running it: this hook fires from `mise install`,
	# and an unexplained sudo prompt there is alarming.
	echo "ffmpeg-deps: running: sudo apt-get install -y ${missing[*]}"
	sudo apt-get install -y ${missing[@]+"${missing[@]}"}
	;;

*)
	# mise.toml gates the ffmpeg tool to linux/macos, so there is nothing to do
	# elsewhere. Exit quietly rather than failing an otherwise-valid install.
	exit 0
	;;
esac
