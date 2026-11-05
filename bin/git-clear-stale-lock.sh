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
#      fills the lock);
#   5. no git process is running in the same repository (the same git dir):
#      once it has written the lock, git may close the descriptor and still
#      own the lock, as `git commit` does while the editor is open;
#   6. it is still the same, still empty file just before removal.
# Any failed guard leaves the lock in place and exits 2. So does a guard
# whose scan fails (running out of file descriptors, say), unless the
# failure only shows a process that has exited or is another user's
# (ENOENT, ESRCH, EACCES) or, in guard 5, a git process in no repository:
# git's "not a git repository" for a directory outside this checkout, a
# GIT_DIR that does not exist, or a GIT_DIR file that is no gitfile.
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
# otherwise), and a failed scan of it fails its guard, so it can only add
# refusals.

set -u
# The error messages read below (bash's, find's, readlink's, git's) are
# matched in English.
export LC_ALL=C

# capture COMMAND...: runs COMMAND in a command substitution, its output and
# errors in $out (less one trailing newline), its status in $rc. bash
# substitutes nothing, with status 0, for a command substitution it cannot
# start (no pipe or process to spare), so a status line is appended: without
# one, capture returns 1. capture_stdout leaves the errors out.
capture() {
	capture_result "$("$@" 2>&1; printf '\n%s' "$?")"
}
capture_stdout() {
	capture_result "$("$@" 2>/dev/null; printf '\n%s' "$?")"
}
capture_result() {
	case "$1" in
	*$'\n'*) ;;
	*) return 1 ;;
	esac
	rc=${1##*$'\n'}
	case "$rc" in
	'' | *[!0-9]*) return 1 ;;
	esac
	out=${1%$'\n'*}
	out=${out%$'\n'}
}

# Whether $out is just the error an exited process (ENOENT, or ESRCH while
# it is being reaped), or another user's (EACCES), gives.
gone_or_foreign() {
	case "$out" in
	*$'\n'*) return 1 ;;
	*": No such file or directory" | *": No such process" | *": Permission denied") return 0 ;;
	esac
	return 1
}

# Whether $1 is a stat or date result: digits, not the nothing a command
# substitution that could not start leaves.
is_number() {
	case "$1" in
	'' | *[!0-9]*) return 1 ;;
	esac
}

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

# rev-parse takes no lock. The git dir is the whole of its output but the
# newline it adds (the path may end in one of its own).
if ! capture_stdout git -C "$dir" rev-parse --absolute-git-dir; then
	echo "git-clear-stale-lock: cannot find the git dir of $dir" >&2
	exit 1
fi
if [ "$rc" -ne 0 ]; then
	echo "git-clear-stale-lock: $dir is not a git repository" >&2
	exit 1
fi
git_dir=$out
case "$git_dir" in
/*) ;;
*)
	echo "git-clear-stale-lock: cannot find the git dir of $dir" >&2
	exit 1
	;;
esac
# The work tree, if any (a bare repository has none): guard 5 knows that a
# git process working in it is in some repository.
if ! capture git -C "$dir" rev-parse --show-toplevel; then
	echo "git-clear-stale-lock: cannot find the work tree of $dir" >&2
	exit 1
fi
top=""
if [ "$rc" -eq 0 ]; then
	top=$out
elif [ "$out" != "fatal: this operation must be run in a work tree" ]; then
	echo "git-clear-stale-lock: cannot find the work tree of $dir" >&2
	exit 1
fi
case "$top" in
'' | /*) ;;
*)
	echo "git-clear-stale-lock: cannot find the work tree of $dir" >&2
	exit 1
	;;
esac
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
is_number "$size" && is_number "$inode" && is_number "$mode" || refuse "cannot stat it"
if [ "$size" -ne 0 ]; then
	refuse "not empty ($size bytes); it may be a live writer's index"
fi

# 3. Old enough.
mtime=$(stat -c %Y -- "$lock") || refuse "cannot stat it"
is_number "$mtime" || refuse "cannot stat it"
now=$(date +%s)
is_number "$now" || refuse "cannot read the clock"
age=$((now - mtime))
if [ "$age" -lt "$min_age" ]; then
	refuse "only $age seconds old (minimum $min_age)"
fi

# 4. No process holds it open. Every readable descriptor of every process is
# compared with the lock's path (find's -lname and -path are globs, so the
# paths' glob characters are escaped); other users' processes are unreadable
# and skipped, and they and processes that exit mid-scan make find exit 1
# with "Permission denied", "No such file or directory" and "No such
# process": any other error (too many open files, out of memory) fails the
# guard.
# find walks each process table itself, pruning all but <pid>/fd, so its
# arguments do not grow with the process count. Its last start point, the
# table again as <root>/., prints the sentinel that shows the scan ran to the
# end: a scan that could not start, died, or printed anything else fails.
glob_escape() {
	printf '%s' "$1" | sed 's/[][*?\\]/\\&/g'
}
pattern=$(glob_escape "$lock")
[ -n "$pattern" ] || refuse "could not scan for processes holding it open"
for root in "${proc_roots[@]}"; do
	root_pattern=$(glob_escape "$root")
	[ -n "$root_pattern" ] || refuse "could not scan for processes holding it open"
	scan=$(find "$root" "$root/." -maxdepth 3 \( \
		-path "$root_pattern/." -prune -printf 'scanned\n' \
		-o -path "$root_pattern/[0-9]*/fd/*" -type l -lname "$pattern" -printf 'held %p\n' \
		-o -path "$root_pattern/[0-9]*/fd" \
		-o -path "$root_pattern/[0-9]*/*" -prune \
		-o -path "$root_pattern/[0-9]*" \
		-o -path "$root_pattern" \
		-o -prune \) 2>&1)
	status=$?
	scanned=0
	unexpected=0
	holder=""
	while IFS= read -r line; do
		case "$line" in
		'') ;;
		scanned) scanned=1 ;;
		"held "*) [ -n "$holder" ] || holder=${line#held } ;;
		*": Permission denied" | *": No such file or directory" | *": No such process") ;;
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
# dir git resolves for its working directory and GIT_DIR (following a
# gitfile, as a linked worktree's .git is); a process in another worktree of
# the same repository has a different git dir and index. Names are read with
# the shell's own read, so the process count never reaches a command line. A
# process that has exited, or another user's (cwd and environ unreadable), is
# skipped quietly; an unreadable environ leaves the working directory to name
# the repository. Any other failure fails the guard: a comm (world-readable)
# that cannot be read while its process is still there for any reason but
# its exit, an error reading cwd or environ, a command substitution that
# could not start, or git failing for any reason but the process being in no
# repository (see the header). git's "not a git repository" is impossible
# inside this checkout's work tree or git dir, so there it fails the guard
# too.

# The value of GIT_DIR in the environ file $1, newlines and all, then a
# newline (which capture drops); nothing if it is unset.
environ_git_dir() {
	set -o pipefail
	sed -z -n '/^GIT_DIR=/{s///p;q}' -- "$1" | tr -d '\0' && echo
}

# git_dir_of DIR [GIT_DIR]: the git dir git uses working in DIR, with GIT_DIR
# if one is given, without the script's own GIT_* settings.
git_dir_of() {
	unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR
	if [ $# -gt 1 ]; then
		export GIT_DIR=$2
	fi
	git -C "$1" rev-parse --absolute-git-dir
}

scan_failed() {
	refuse "could not scan for git processes"
}

for root in "${proc_roots[@]}"; do
	for proc in "$root"/[0-9]*; do
		comm=""
		if ! { IFS= read -r comm <"$proc/comm"; } 2>/dev/null && [ -z "$comm" ]; then
			# read fails on a last line without a newline too; that sets comm.
			# A process that is still there may be exiting: read it again for
			# the reason, which may only be that it has gone.
			[ -e "$proc" ] || continue
			capture cat -- "$proc/comm" || scan_failed
			if [ "$rc" -ne 0 ]; then
				case "$out" in
				*$'\n'*) scan_failed ;;
				*": No such file or directory" | *": No such process") continue ;;
				*) scan_failed ;;
				esac
			fi
			comm=$out
		fi
		[ "$comm" = git ] || continue
		pid=${proc##*/}
		capture readlink -v -- "$proc/cwd" || scan_failed
		if [ "$rc" -ne 0 ]; then
			gone_or_foreign && continue
			scan_failed
		fi
		cwd=$out
		capture environ_git_dir "$proc/environ" || scan_failed
		if [ "$rc" -ne 0 ]; then
			gone_or_foreign || scan_failed
			out=""
		fi
		env_git_dir=$out
		# What git is asked about: an absolute GIT_DIR needs no working
		# directory (which may be gone), a relative one is the process's.
		if [ -z "$env_git_dir" ]; then
			git_args=("$cwd")
			named=$cwd
		else
			case "$env_git_dir" in
			/*)
				git_args=(/ "$env_git_dir")
				named=$env_git_dir
				;;
			*)
				git_args=("$cwd" "$env_git_dir")
				named=$cwd/$env_git_dir
				;;
			esac
		fi
		proc_git_dir=""
		# The git dir is the whole of git's output; its errors are fetched
		# only when it fails, by asking again.
		capture_stdout git_dir_of "${git_args[@]}" || scan_failed
		if [ "$rc" -eq 0 ]; then
			proc_git_dir=$out
		else
			# A success this time matches none of these, and fails the guard.
			capture git_dir_of "${git_args[@]}" || scan_failed
			case "$out" in
			"fatal: not a git repository"*)
				if [ -n "$env_git_dir" ] && [ ! -e "$named" ]; then
					: # a GIT_DIR that does not exist
				else
					case "$named/" in
					"$git_dir"/*) scan_failed ;;
					esac
					if [ -n "$top" ]; then
						case "$named/" in
						"$top"/*) scan_failed ;;
						esac
					fi
				fi
				;;
			"fatal: invalid gitfile format: "*)
				# A GIT_DIR file that is no gitfile: no git runs with it.
				case "$out" in
				*$'\n'*) scan_failed ;;
				esac
				[ -n "$env_git_dir" ] || scan_failed
				;;
			"fatal: cannot change to '"*)
				out=${out#fatal: }
				gone_or_foreign || scan_failed
				;;
			*) scan_failed ;;
			esac
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
