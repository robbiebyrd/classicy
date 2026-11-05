#!/bin/bash
# Remove a stale, empty index.lock, and only that.
#
# usage: bin/git-clear-stale-lock.sh [--dry-run] [--min-age SECONDS] [DIR]
#
# DIR (default: the current directory) names the checkout. A linked worktree
# has its own lock (.git/worktrees/<name>/index.lock), and that is the one
# this clears; the main checkout's lock is cleared from the main checkout.
#
# Why these locks appear (story 0094-h7m): a `git status` that is SIGKILLed
# leaves the lock it took, empty, because git holds the lock open and empty
# while it scans the worktree and only removes it on exit or on a catchable
# signal. Go's exec.CommandContext kills with SIGKILL when its timeout
# expires; a umask of 077 in the killed process's parent makes the lock
# mode 600.
#
# The lock is removed only when every guard passes:
#   1. it is a regular file (not a symbolic link or a directory);
#   2. it is empty: a lock that holds data may be a live writer's index;
#   3. it is at least --min-age seconds old (default 60) by mtime;
#   4. no process holds it open (git keeps the descriptor open while it
#      fills the lock); a scan for holders that cannot run fails it;
#   5. no git process is running in the same repository (the same git dir):
#      once it has written the lock, git may close the descriptor and still
#      own the lock, as `git commit` does while the editor is open;
#   6. it is still the same, still empty file just before removal.
# Any failed guard leaves the lock in place and exits 2.
#
# Exit status: 0 removed (or would remove, or there was no lock), 1 usage or
# environment error, 2 refused.
#
# Linux only: guards 4 and 5 read /proc. Elsewhere it refuses (exit 1); check
# the guards by hand there (lsof shows holders).
#
# For tests, CLASSICY_EXTRA_PROC_ROOT names a directory laid out like /proc
# whose processes guards 4 and 5 scan as well as /proc's, never instead. It
# must be an absolute path to a readable directory other than / (exit 1
# otherwise), and a scan of it that cannot run fails guard 4, so it can only
# add refusals.

set -u

min_age=60
dry_run=0
dir=.

usage() {
	echo "usage: $0 [--dry-run] [--min-age SECONDS] [DIR]" >&2
	exit 1
}

while [ $# -gt 0 ]; do
	case "$1" in
	--dry-run) dry_run=1 ;;
	--min-age)
		[ $# -ge 2 ] || usage
		min_age=$2
		shift
		;;
	-h | --help) usage ;;
	-*) usage ;;
	*) dir=$1 ;;
	esac
	shift
done

case "$min_age" in
'' | *[!0-9]*)
	echo "git-clear-stale-lock: --min-age must be a whole number of seconds" >&2
	exit 1
	;;
esac

if [ ! -d /proc/self/fd ]; then
	echo "git-clear-stale-lock: /proc is not available; check the lock by hand" >&2
	exit 1
fi

# The extra process table, made canonical so the paths find reports match
# the patterns built from it.
extra_proc_root=${CLASSICY_EXTRA_PROC_ROOT:-}
if [ -n "$extra_proc_root" ]; then
	case "$extra_proc_root" in
	/*) ;;
	*)
		echo "git-clear-stale-lock: CLASSICY_EXTRA_PROC_ROOT must be an absolute path" >&2
		exit 1
		;;
	esac
	# cd refuses what is not a searchable directory; -r, one find cannot list.
	if [ ! -r "$extra_proc_root" ] ||
		! extra_proc_root=$(cd -- "$extra_proc_root" 2>/dev/null && pwd -P) ||
		[ "$extra_proc_root" = / ]; then
		echo "git-clear-stale-lock: CLASSICY_EXTRA_PROC_ROOT must be a readable directory other than /" >&2
		exit 1
	fi
fi
proc_roots=(/proc)
if [ -n "$extra_proc_root" ]; then
	proc_roots+=("$extra_proc_root")
fi

# rev-parse takes no lock.
if ! git_dir=$(git -C "$dir" rev-parse --absolute-git-dir 2>/dev/null); then
	echo "git-clear-stale-lock: $dir is not a git repository" >&2
	exit 1
fi
lock="$git_dir/index.lock"

refuse() {
	echo "git-clear-stale-lock: keeping $lock: $1" >&2
	exit 2
}

if [ ! -e "$lock" ] && [ ! -L "$lock" ]; then
	echo "no index.lock in $git_dir"
	exit 0
fi

# 1. A regular file.
if [ -L "$lock" ] || [ ! -f "$lock" ]; then
	refuse "not a regular file"
fi

# 2. Empty.
size=$(stat -c %s -- "$lock") || refuse "cannot stat it"
inode=$(stat -c %i -- "$lock") || refuse "cannot stat it"
mode=$(stat -c %a -- "$lock") || refuse "cannot stat it"
if [ "$size" -ne 0 ]; then
	refuse "not empty ($size bytes); it may be a live writer's index"
fi

# 3. Old enough.
mtime=$(stat -c %Y -- "$lock") || refuse "cannot stat it"
age=$(($(date +%s) - mtime))
if [ "$age" -lt "$min_age" ]; then
	refuse "only $age seconds old (minimum $min_age)"
fi

# 4. No process holds it open. Every readable descriptor of every process is
# compared with the lock's path (find's -lname and -path are globs, so the
# paths' glob characters are escaped); other users' processes are unreadable
# and skipped, and they and processes that exit mid-scan make find exit 1.
# find walks each process table itself, pruning all but <pid>/fd, so its
# arguments do not grow with the process count. Its last start point, the
# table again as <root>/., prints the sentinel that shows the scan ran to the
# end: a scan that could not start, died, or printed anything else fails.
glob_escape() {
	printf '%s' "$1" | sed 's/[][*?\\]/\\&/g'
}
pattern=$(glob_escape "$lock")
for root in "${proc_roots[@]}"; do
	root_pattern=$(glob_escape "$root")
	scan=$(find "$root" "$root/." -maxdepth 3 \( \
		-path "$root_pattern/." -prune -printf 'scanned\n' \
		-o -path "$root_pattern/[0-9]*/fd/*" -type l -lname "$pattern" -printf 'held %p\n' \
		-o -path "$root_pattern/[0-9]*/fd" \
		-o -path "$root_pattern/[0-9]*/*" -prune \
		-o -path "$root_pattern/[0-9]*" \
		-o -path "$root_pattern" \
		-o -prune \) 2>/dev/null)
	status=$?
	scanned=0
	unexpected=0
	holder=""
	while IFS= read -r line; do
		case "$line" in
		'') ;;
		scanned) scanned=1 ;;
		"held "*) [ -n "$holder" ] || holder=${line#held } ;;
		*) unexpected=1 ;;
		esac
	done <<<"$scan"
	if [ -n "$holder" ]; then
		pid=${holder%/fd/*}
		refuse "held open by pid ${pid##*/}"
	fi
	if [ "$status" -gt 1 ] || [ "$scanned" -ne 1 ] || [ "$unexpected" -ne 0 ]; then
		refuse "could not scan for processes holding it open"
	fi
done

# 5. No git process in the same repository. A process's repository is the git
# dir its working directory (or its GIT_DIR) resolves to; a process in
# another worktree of the same repository has a different git dir and index.
# A /proc read that fails (another user's process, or one that has exited)
# is quiet: an input redirect fails before a 2>/dev/null after it applies, so
# each such read is grouped and the group's stderr discarded. An unreadable
# environ leaves the working directory to name the repository. Names are
# read with the shell's own read, so the process count never reaches a
# command line.
for root in "${proc_roots[@]}"; do
	for proc in "$root"/[0-9]*; do
		comm=""
		{ IFS= read -r comm <"$proc/comm"; } 2>/dev/null
		[ "$comm" = git ] || continue
		pid=${proc##*/}
		cwd=$(readlink -- "$proc/cwd" 2>/dev/null) || continue
		proc_git_dir=""
		env_git_dir=$({ tr '\0' '\n' <"$proc/environ"; } 2>/dev/null | sed -n 's/^GIT_DIR=//p' | head -n 1)
		if [ -n "$env_git_dir" ]; then
			case "$env_git_dir" in
			/*) ;;
			*) env_git_dir="$cwd/$env_git_dir" ;;
			esac
			proc_git_dir=$(cd -- "$env_git_dir" 2>/dev/null && pwd -P)
		else
			proc_git_dir=$(git -C "$cwd" rev-parse --absolute-git-dir 2>/dev/null)
		fi
		if [ -n "$proc_git_dir" ] && [ "$proc_git_dir" = "$git_dir" ]; then
			refuse "git process $pid is running in this repository ($({ tr '\0' ' ' <"$proc/cmdline"; } 2>/dev/null | cut -c1-120 | sed 's/ $//'))"
		fi
	done
done

if [ "$dry_run" -eq 1 ]; then
	echo "would remove $lock (empty, mode $mode, $age seconds old, unheld)"
	exit 0
fi

# 6. Still the same, still empty file.
if [ "$(stat -c %i -- "$lock" 2>/dev/null)" != "$inode" ] || [ -s "$lock" ]; then
	refuse "it changed while being checked"
fi

rm -f -- "$lock" || refuse "rm failed"
echo "removed $lock (empty, mode $mode, $age seconds old, unheld)"
