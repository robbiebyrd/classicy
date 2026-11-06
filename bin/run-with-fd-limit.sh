#!/bin/bash
# usage: bin/run-with-fd-limit.sh LIMIT SCRIPT [ARGS...]
#
# Runs SCRIPT with bash under an open-file-descriptor limit of LIMIT. Test
# helper for bin/gitClearStaleLock.test.ts (git-clear-stale-lock.sh must
# refuse, not misjudge, when it runs out of descriptors); a script file rather
# than `bash -c` so no command text is ever built from values.
set -euo pipefail
limit=$1
shift
ulimit -n "$limit"
exec bash "$@"
