#!/bin/bash
# Create new packages on npm so that push.yml can publish them over OIDC.
#
# usage: bin/npm-bootstrap-trusted-publishing.sh [--publish] [PACKAGE_JSON...]
#
# npm trusted publishing is configured per package, and only for a package
# that already exists on the registry (`npm help trust`, "Package must
# exist"). A package push.yml has never published therefore needs one publish
# by hand first (story 0156-tx7). For each package.json given (default: the
# core's and Platinum's) this:
#   1. publishes a placeholder, <name>@0.0.0, unless the name is on npm already;
#   2. deprecates that placeholder, so nobody installs it by mistake;
#   3. adds the trusted publisher push.yml publishes through: GitHub Actions,
#      repository robbiebyrd/classicy, workflow push.yml, no environment,
#      `npm publish` allowed.
# Without --publish it is a dry run: nothing on the registry changes, and npm
# prints what each step would do.
#
# Run it logged in (`npm login`) as an owner of the npm organization, with
# two-factor authentication on, and npm 11.15.0 or later (`npm trust`). npm
# asks for a one-time password at each step. A new trusted publisher expires
# unless a publish uses it within 2 days, so run it with --publish no more than
# a day before the release that publishes these packages.
#
# Exit status: 0 done (or would be done), 1 usage or npm error.

set -euo pipefail

REPOSITORY="robbiebyrd/classicy"
WORKFLOW="push.yml"
PLACEHOLDER_VERSION="0.0.0"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH=0
MANIFESTS=()
for arg in "$@"; do
	case "$arg" in
	--publish) PUBLISH=1 ;;
	-h | --help)
		sed -n '2,/^$/{s/^# \{0,1\}//;p;}' "$0"
		exit 0
		;;
	-*)
		echo "unknown option: $arg (see --help)" >&2
		exit 1
		;;
	*) MANIFESTS+=("$arg") ;;
	esac
done
if [ "${#MANIFESTS[@]}" -eq 0 ]; then
	MANIFESTS=("$ROOT/package.json" "$ROOT/packages/appearance/platinum/package.json")
fi

NPM_VERSION="$(npm --version)"
if ! node -e '
	const [major, minor] = process.argv[1].split(".").map(Number);
	process.exit(major > 11 || (major === 11 && minor >= 15) ? 0 : 1);
' "$NPM_VERSION"; then
	echo "npm $NPM_VERSION has no \`npm trust\`; it needs npm 11.15.0 or later (npm install -g npm@^11.15.0)." >&2
	exit 1
fi

# Plain words, not arrays: macOS's /bin/bash 3.2 fails on an empty array
# under `set -u`.
if [ "$PUBLISH" = 1 ]; then
	DRY_RUN=""
	CONFIRM="--yes"
else
	DRY_RUN="--dry-run"
	CONFIRM=""
	echo "Dry run: nothing on the registry changes. Pass --publish to do it."
fi

for MANIFEST in "${MANIFESTS[@]}"; do
	NAME="$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).name' "$MANIFEST")"
	echo
	echo "== $NAME"

	if VIEW="$(npm view "$NAME" name 2>&1)"; then
		echo "$NAME is already on npm; no placeholder needed."
	elif grep -q "E404" <<<"$VIEW"; then
		PLACEHOLDER="$(mktemp -d "${TMPDIR:-/tmp}/classicy-placeholder.XXXXXX")"
		node -e '
			const fs = require("fs");
			const [manifest, dir, version] = process.argv.slice(1);
			const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
			const placeholder = {
				name: m.name,
				version,
				description: `Placeholder that let ${m.name} take a trusted publisher. Install a later version.`,
				repository: m.repository,
				license: m.license,
			};
			fs.writeFileSync(`${dir}/package.json`, `${JSON.stringify(placeholder, null, 2)}\n`);
			fs.writeFileSync(
				`${dir}/README.md`,
				`# ${m.name} ${version}\n\nA placeholder, published once so that the package could be given a trusted publisher. It contains no code. Install a later version.\n`,
			);
		' "$MANIFEST" "$PLACEHOLDER" "$PLACEHOLDER_VERSION"
		# shellcheck disable=SC2086 # DRY_RUN is one word or none
		(cd "$PLACEHOLDER" && npm publish --access public $DRY_RUN)
		DEPRECATION="Placeholder with no code; install a later version."
		if [ "$PUBLISH" = 1 ]; then
			npm deprecate "$NAME@$PLACEHOLDER_VERSION" "$DEPRECATION"
		else
			echo "Would run: npm deprecate $NAME@$PLACEHOLDER_VERSION \"$DEPRECATION\""
		fi
	else
		echo "$VIEW" >&2
		echo "Could not tell whether $NAME is on npm; nothing was published." >&2
		exit 1
	fi

	# shellcheck disable=SC2086 # DRY_RUN and CONFIRM are one word or none
	npm trust github "$NAME" --repo "$REPOSITORY" --file "$WORKFLOW" --allow-publish $DRY_RUN $CONFIRM
done

echo
if [ "$PUBLISH" = 1 ]; then
	echo "Done. These trusted publishers expire unless a publish uses them within 2 days:"
	echo "release (merge the pull request that publishes these packages) before then."
else
	echo "Dry run complete. A trusted publisher added with --publish expires unless a"
	echo "publish uses it within 2 days."
fi
