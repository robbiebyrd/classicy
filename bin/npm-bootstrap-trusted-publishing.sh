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
#   1. publishes a placeholder, <name>@0.0.0, under the `bootstrap` dist-tag,
#      unless the name is on npm already;
#   2. deprecates <name>@0.0.0, naming the first real release, so nobody
#      installs it by mistake, unless it is deprecated already;
#   3. adds the trusted publisher push.yml publishes through: GitHub Actions,
#      repository robbiebyrd/classicy, workflow push.yml, no environment,
#      `npm publish` allowed, unless the package has it already. The registry
#      takes one configuration per package, so a different one stops the run;
#      it is never revoked or replaced.
# Each step checks the registry first, so a run that stopped partway (a
# mistyped one-time password, a dropped connection) is safe to re-run.
# Without --publish it is a dry run: nothing on the registry changes, and npm
# prints what each step would do.
#
# Run it logged in (`npm login`) as an owner of the npm organization, with
# two-factor authentication on, and npm 11.15.0 or later (`npm trust`). npm
# asks for a one-time password at each step. A new trusted publisher expires
# unless a publish uses it within 2 days, so run it with --publish no more than
# a day before the release that publishes these packages.
#
# The `bootstrap` tag keeps the placeholder off `latest` as far as the CLI
# can: npm sends only the tag it is given. npm's docs do not say whether the
# registry also points `latest` at a brand-new package's first version, so
# check with `npm dist-tag ls <name>` a few minutes later. A `latest` that is
# set cannot be removed, but the first release (push.yml publishes with
# `--tag latest`) takes it either way; until then the deprecation is the guard.
#
# Exit status: 0 done (or would be done), 1 usage or npm error.

set -euo pipefail

REPOSITORY="robbiebyrd/classicy"
WORKFLOW="push.yml"
PLACEHOLDER_VERSION="0.0.0"
PLACEHOLDER_TAG="bootstrap"
# The release the placeholder makes way for, named in its deprecation.
FIRST_RELEASE="3.0.0"

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

# Reads `npm trust list <name> --json` (one JSON object per configuration,
# printed one after another; nothing when there are none) from stdin and
# prints "none", "match", or "other <description>" for the first
# configuration that is not push.yml's.
classify_trust() {
	node -e '
		const [repository, file] = process.argv.slice(1);
		const text = require("fs").readFileSync(0, "utf8");
		const entries = [];
		let depth = 0, start = -1, inString = false, escaped = false;
		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			if (inString) {
				if (escaped) escaped = false;
				else if (c === "\\") escaped = true;
				else if (c === "\"") inString = false;
			} else if (c === "\"") inString = true;
			else if (c === "{") { if (depth++ === 0) start = i; }
			else if (c === "}" && --depth === 0) entries.push(JSON.parse(text.slice(start, i + 1)));
		}
		const ours = (e) =>
			e.type === "github" && e.repository === repository && e.file === file &&
			!e.environment && (e.permissions ?? []).includes("createPackage");
		if (entries.length === 0) console.log("none");
		else if (entries.some(ours)) console.log("match");
		else {
			const e = entries[0];
			const env = e.environment ? `, environment ${e.environment}` : "";
			console.log(`other ${e.type ?? "?"} ${e.repository ?? "?"} ${e.file ?? "?"}${env}, permissions: ${(e.permissions ?? []).join(", ") || "none"}`);
		}
	' "$REPOSITORY" "$WORKFLOW"
}

DEPRECATION_FOR() { echo "Placeholder with no code; install $1@$FIRST_RELEASE or later."; }

# npm's error output for the deprecation lookup (a small file left in $TMPDIR).
VIEW_ERR="$(mktemp "${TMPDIR:-/tmp}/classicy-bootstrap-view.XXXXXX")"

# Each step checks what is already on the registry, so a run that stopped
# partway (a mistyped one-time password, a dropped connection) can be re-run.
for MANIFEST in "${MANIFESTS[@]}"; do
	NAME="$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).name' "$MANIFEST")"
	DEPRECATION="$(DEPRECATION_FOR "$NAME")"
	echo
	echo "== $NAME"

	# 1. The placeholder.
	if VIEW="$(npm view "$NAME" name 2>&1)"; then
		EXISTED=1
		echo "$NAME is already on npm; no placeholder needed."
	elif grep -q "E404" <<<"$VIEW"; then
		EXISTED=0
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
		(cd "$PLACEHOLDER" && npm publish --access public --tag "$PLACEHOLDER_TAG" $DRY_RUN)
	else
		echo "$VIEW" >&2
		echo "Could not tell whether $NAME is on npm; nothing was published." >&2
		exit 1
	fi

	# 2. Its deprecation, whoever published it. Just published, the version may
	# not be listed yet, so it is deprecated without asking.
	if [ "$EXISTED" = 0 ]; then
		NEEDS_DEPRECATION=1
	elif DEPRECATED="$(npm view "$NAME@$PLACEHOLDER_VERSION" deprecated 2>"$VIEW_ERR")"; then
		if [ -z "$DEPRECATED" ]; then
			NEEDS_DEPRECATION=1
		else
			NEEDS_DEPRECATION=0
			echo "$NAME@$PLACEHOLDER_VERSION is already deprecated: $DEPRECATED"
		fi
	elif grep -q "E404" "$VIEW_ERR"; then
		NEEDS_DEPRECATION=0
		echo "$NAME has no $PLACEHOLDER_VERSION; nothing to deprecate."
	else
		cat "$VIEW_ERR" >&2
		echo "Could not tell whether $NAME@$PLACEHOLDER_VERSION is deprecated." >&2
		exit 1
	fi
	if [ "$NEEDS_DEPRECATION" = 1 ]; then
		if [ "$PUBLISH" = 1 ]; then
			npm deprecate "$NAME@$PLACEHOLDER_VERSION" "$DEPRECATION"
		else
			echo "Would run: npm deprecate $NAME@$PLACEHOLDER_VERSION \"$DEPRECATION\""
		fi
	fi

	# 3. Its trusted publisher. The registry takes one configuration per
	# package (`npm help trust`), so an existing one is never replaced: push.yml's
	# is left alone, and any other stops the run for the owner to look at.
	TRUST="none"
	if [ "$EXISTED" = 1 ]; then
		if LIST="$(npm trust list "$NAME" --json)"; then
			TRUST="$(classify_trust <<<"$LIST")"
		elif [ "$PUBLISH" = 1 ]; then
			echo "Could not list $NAME's trusted publishers (are you logged in?); nothing was changed." >&2
			exit 1
		else
			echo "Could not list $NAME's trusted publishers (are you logged in?); the dry run goes on."
		fi
	fi
	case "$TRUST" in
	match)
		echo "$NAME is already trusted: GitHub Actions, $REPOSITORY, $WORKFLOW, npm publish allowed."
		;;
	none)
		# shellcheck disable=SC2086 # DRY_RUN and CONFIRM are one word or none
		npm trust github "$NAME" --repo "$REPOSITORY" --file "$WORKFLOW" --allow-publish $DRY_RUN $CONFIRM
		;;
	*)
		echo "$NAME already has a different trusted publisher (${TRUST#other }), and the registry takes one per package." >&2
		echo "Nothing was changed. Edit or remove it on npmjs.com (package Settings, Trusted Publisher) so it is GitHub Actions, $REPOSITORY, $WORKFLOW, no environment, npm publish allowed; then re-run." >&2
		exit 1
		;;
	esac
done

echo
echo "Placeholders go out under the \`$PLACEHOLDER_TAG\` dist-tag. If the registry also"
echo "points \`latest\` at a new package's first version (npm's docs do not say), then"
echo "\`latest\` reads $PLACEHOLDER_VERSION until the $FIRST_RELEASE release. A \`latest\` tag"
echo "cannot be removed once set, so leave it: the $FIRST_RELEASE release takes \`latest\`"
echo "either way, and until then the deprecation is the guard (installs warn, naming"
echo "$FIRST_RELEASE). Otherwise \`latest\` stays unset until then."
echo "A few minutes after --publish, check each package with \`npm dist-tag ls <name>\`:"
for MANIFEST in "${MANIFESTS[@]}"; do
	echo "  npm dist-tag ls $(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).name' "$MANIFEST")"
done
echo "If the script stopped partway, re-running it is safe: it skips what is done."
echo
if [ "$PUBLISH" = 1 ]; then
	echo "Done. These trusted publishers expire unless a publish uses them within 2 days:"
	echo "release (merge the pull request that publishes these packages) before then."
else
	echo "Dry run complete. A trusted publisher added with --publish expires unless a"
	echo "publish uses it within 2 days."
fi
