import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(__dirname, "git-clear-stale-lock.sh");

// A git environment free of anything the runner inherited (a hook's GIT_DIR,
// say), so every command acts on the temporary repository it is pointed at.
const gitEnv = (): NodeJS.ProcessEnv => {
	const env = { ...process.env };
	for (const key of Object.keys(env)) {
		if (key.startsWith("GIT_")) delete env[key];
	}
	return env;
};

const git = (cwd: string, ...args: string[]) => {
	const result = spawnSync("git", args, {
		cwd,
		env: gitEnv(),
		encoding: "utf8",
	});
	if (result.status !== 0)
		throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
	return result.stdout.trim();
};

const tempDirs: string[] = [];
const children: ChildProcess[] = [];

afterEach(() => {
	for (const child of children.splice(0)) {
		child.stdin?.end();
		if (child.exitCode === null) child.kill();
	}
	for (const dir of tempDirs.splice(0)) removeTree(dir);
});

// Removes a test's directory even when the test left part of it unreadable,
// so no run strands a /tmp/classicy-* directory.
function removeTree(dir: string) {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
	} catch {
		spawnSync("chmod", ["-R", "u+rwx", dir]);
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const makeRepo = () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
	tempDirs.push(dir);
	const repo = path.join(dir, "repo");
	fs.mkdirSync(repo);
	git(repo, "init", "-q");
	git(
		repo,
		"-c",
		"user.name=t",
		"-c",
		"user.email=t@t",
		"commit",
		"-q",
		"--allow-empty",
		"-m",
		"init",
	);
	return repo;
};

const TEN_MINUTES_AGO = () => new Date(Date.now() - 10 * 60 * 1000);

// An empty lock, aged ten minutes unless `fresh`, like the ones a killed
// `git status` leaves behind.
const makeLock = (lock: string, { fresh = false, content = "" } = {}) => {
	fs.writeFileSync(lock, content, { mode: 0o600 });
	if (!fresh) fs.utimesSync(lock, TEN_MINUTES_AGO(), TEN_MINUTES_AGO());
	return lock;
};

const run = (cwd: string, ...args: string[]) =>
	spawnSync("bash", [SCRIPT, ...args], {
		cwd,
		env: gitEnv(),
		encoding: "utf8",
	});

const runWithEnv = (env: NodeJS.ProcessEnv, cwd: string, ...args: string[]) =>
	spawnSync("bash", [SCRIPT, ...args], {
		cwd,
		env: { ...gitEnv(), ...env },
		encoding: "utf8",
	});

// Runs the script with a fake process table beside the real /proc.
const runWithProcs = (procRoot: string, cwd: string, ...args: string[]) =>
	runWithEnv({ CLASSICY_EXTRA_PROC_ROOT: procRoot }, cwd, ...args);

// The first executable called `name` on PATH, for a fake that wraps it.
const realBinary = (name: string) => {
	for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
		const candidate = path.join(dir, name);
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {}
	}
	throw new Error(`no ${name} on PATH`);
};

// A directory of fake commands to put first on the script's PATH.
const makeFakeBin = (commands: Record<string, string>) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-bin-"));
	tempDirs.push(dir);
	for (const [name, body] of Object.entries(commands))
		fs.writeFileSync(path.join(dir, name), `#!/bin/bash\n${body}\n`, {
			mode: 0o755,
		});
	return `${dir}${path.delimiter}${process.env.PATH ?? ""}`;
};

const ARG_MAX = Number(
	spawnSync("getconf", ["ARG_MAX"], { encoding: "utf8" }).stdout.trim(),
);

// A fake process table too big to pass one argument per process: long,
// all-digit names (zero-padded, so unique) make each path about 230 bytes.
// Built once, it is shared by the tests that need it.
let hugeProcRoot: string | undefined;
const getHugeProcRoot = () => {
	if (hugeProcRoot) return hugeProcRoot;
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-procs-"));
	const width = 200;
	const perProcess = root.length + width + "//comm".length + 1 + 8;
	const count = Math.ceil(ARG_MAX / perProcess) + 100;
	for (let i = 1; i <= count; i++) {
		const dir = path.join(root, String(i).padStart(width, "0"));
		fs.mkdirSync(path.join(dir, "fd"), { recursive: true });
		fs.writeFileSync(path.join(dir, "comm"), "sleep\n");
	}
	hugeProcRoot = root;
	return root;
};
afterAll(() => {
	if (hugeProcRoot) removeTree(hugeProcRoot);
});

// Runs the script with at most `limit` open file descriptors, through a
// helper script (not `bash -c`), so no command text is built from values.
const FD_LIMIT_RUNNER = path.resolve(__dirname, "run-with-fd-limit.sh");
const runUnderFdLimit = (limit: number, cwd: string, ...args: string[]) =>
	spawnSync("bash", [FD_LIMIT_RUNNER, String(limit), SCRIPT, ...args], {
		cwd,
		env: gitEnv(),
		encoding: "utf8",
	});

// A process that holds `file` open for the test's length.
const holdOpen = (file: string) => {
	const fd = fs.openSync(file, "r");
	const holder = spawn("sleep", ["30"], { stdio: ["ignore", fd, "ignore"] });
	fs.closeSync(fd);
	children.push(holder);
	waitForProc(holder);
	return holder;
};

// Above Linux's largest pid_max (2^22), so no real process shares it.
const FAKE_PID = "9999999";

type FakeProc = {
	comm?: string;
	// The working directory the cwd link points at; omitted, there is no link
	// (the process exited, or belongs to another user).
	cwd?: string;
	// NUL-separated variables; "unreadable" writes it mode 000, as another
	// user's process reads; omitted, there is no file, as an exited one reads.
	environ?: string[] | "unreadable";
	cmdline?: string[];
	// Paths the process holds open, one fd link each.
	fds?: string[];
};

// A process directory in a fake process table, with the files the script
// reads, so a test can give it a process /proc could not show it on demand.
const makeFakeProc = (
	root: string,
	{ comm = "git", cwd, environ, cmdline, fds }: FakeProc,
) => {
	const dir = path.join(root, FAKE_PID);
	fs.mkdirSync(path.join(dir, "fd"), { recursive: true });
	fs.writeFileSync(path.join(dir, "comm"), `${comm}\n`);
	if (cwd !== undefined) fs.symlinkSync(cwd, path.join(dir, "cwd"));
	if (environ === "unreadable") {
		fs.writeFileSync(path.join(dir, "environ"), "PATH=/usr/bin\0");
		fs.chmodSync(path.join(dir, "environ"), 0o000);
	} else if (environ !== undefined) {
		fs.writeFileSync(
			path.join(dir, "environ"),
			environ.map((entry) => `${entry}\0`).join(""),
		);
	}
	if (cmdline !== undefined)
		fs.writeFileSync(
			path.join(dir, "cmdline"),
			cmdline.map((arg) => `${arg}\0`).join(""),
		);
	fds?.forEach((target, index) => {
		fs.symlinkSync(target, path.join(dir, "fd", String(index + 3)));
	});
};

const makeProcRoot = () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-proc-"));
	tempDirs.push(dir);
	return dir;
};

// Wait until /proc shows the child running, so the script can see it.
const waitForProc = (child: ChildProcess) => {
	const deadline = Date.now() + 5000;
	while (!fs.existsSync(`/proc/${child.pid}/cwd`)) {
		if (Date.now() > deadline) throw new Error("child never started");
	}
};

// The script reads /proc, so it (and this suite) is Linux only.
describe.runIf(process.platform === "linux")("git-clear-stale-lock.sh", () => {
	it("reports nothing to do when there is no lock", () => {
		const repo = makeRepo();
		const result = run(repo);
		expect(result.status).toBe(0);
		expect(result.stdout).toMatch(/no index\.lock/);
	});

	it("removes an empty, old, unheld lock", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const result = run(repo);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(result.stdout).toMatch(/removed .*index\.lock/);
		expect(fs.existsSync(lock)).toBe(false);
	});

	it("takes the repository as an argument", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const result = run(os.tmpdir(), repo);
		expect(result.status).toBe(0);
		expect(fs.existsSync(lock)).toBe(false);
	});

	it("keeps a lock that holds data", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"), {
			content: "DIRC",
		});
		const result = run(repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(/not empty/);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("keeps a lock younger than the minimum age", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"), {
			fresh: true,
		});
		const result = run(repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(/seconds old/);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("honors --min-age", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const result = run(repo, "--min-age", "3600");
		expect(result.status).toBe(2);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("keeps a lock a process holds open", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const fd = fs.openSync(lock, "r");
		const holder = spawn("sleep", ["30"], { stdio: ["ignore", fd, "ignore"] });
		fs.closeSync(fd);
		children.push(holder);
		waitForProc(holder);
		const result = run(repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(new RegExp(`held open by pid ${holder.pid}`));
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("keeps the lock while a git process runs in that repository", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		// `hash-object --stdin` waits on stdin: a git process that holds no lock.
		const busy = spawn("git", ["hash-object", "--stdin"], {
			cwd: repo,
			env: gitEnv(),
		});
		children.push(busy);
		waitForProc(busy);
		const result = run(repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(
			new RegExp(`git process ${busy.pid} is running`),
		);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("ignores a git process running in another repository", () => {
		const repo = makeRepo();
		const other = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const busy = spawn("git", ["hash-object", "--stdin"], {
			cwd: other,
			env: gitEnv(),
		});
		children.push(busy);
		waitForProc(busy);
		const result = run(repo);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(fs.existsSync(lock)).toBe(false);
	});

	it("clears a linked worktree's own lock and leaves the main checkout's alone", () => {
		const repo = makeRepo();
		const worktree = path.join(path.dirname(repo), "wt");
		git(repo, "worktree", "add", "-q", "-b", "wt", worktree);
		const mainLock = makeLock(path.join(repo, ".git", "index.lock"));
		const worktreeLock = makeLock(
			path.join(repo, ".git", "worktrees", "wt", "index.lock"),
		);
		// A git process in the main checkout does not touch the worktree's index.
		const busy = spawn("git", ["hash-object", "--stdin"], {
			cwd: repo,
			env: gitEnv(),
		});
		children.push(busy);
		waitForProc(busy);
		const result = run(worktree);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(fs.existsSync(worktreeLock)).toBe(false);
		expect(fs.existsSync(mainLock)).toBe(true);
	});

	it("only reports with --dry-run", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const result = run(repo, "--dry-run");
		expect(result.status).toBe(0);
		expect(result.stdout).toMatch(/would remove/);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("refuses a lock that is a symbolic link", () => {
		const repo = makeRepo();
		const target = path.join(repo, "target");
		fs.writeFileSync(target, "");
		const lock = path.join(repo, ".git", "index.lock");
		fs.symlinkSync(target, lock);
		const result = run(repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(/not a regular file/);
		expect(fs.lstatSync(lock).isSymbolicLink()).toBe(true);
	});

	it("sees a git process in the extra process table", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, {
			cwd: repo,
			environ: ["PATH=/usr/bin"],
			cmdline: ["git", "status"],
		});
		const result = runWithProcs(procs, repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toBe(
			`git-clear-stale-lock: keeping ${fs.realpathSync(lock)}: git process ${FAKE_PID} is running in this repository (git status)\n`,
		);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("follows a git process's GIT_DIR into this repository", () => {
		const repo = makeRepo();
		const other = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, {
			cwd: other,
			environ: ["PATH=/usr/bin", `GIT_DIR=${path.join(repo, ".git")}`],
			cmdline: ["git", "commit"],
		});
		const result = runWithProcs(procs, repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(
			new RegExp(`git process ${FAKE_PID} is running in this repository`),
		);
		expect(fs.existsSync(lock)).toBe(true);
	});

	it("sees a holder in the extra process table", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, {
			comm: "sleep",
			cwd: os.tmpdir(),
			fds: [fs.realpathSync(lock)],
		});
		const result = runWithProcs(procs, repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(
			new RegExp(`held open by pid ${FAKE_PID}$`, "m"),
		);
		expect(fs.existsSync(lock)).toBe(true);
	});

	// Another user's process reads mode 000 (unless this runs as root).
	it.skipIf(process.getuid?.() === 0)(
		"keeps quiet about a git process whose environment cannot be read",
		() => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: other,
				environ: "unreadable",
				cmdline: ["git", "status"],
			});
			const result = runWithProcs(procs, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		},
	);

	it("keeps quiet about a git process that exits before its environment is read", () => {
		const repo = makeRepo();
		const other = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, { cwd: other, cmdline: ["git", "status"] });
		const result = runWithProcs(procs, repo);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(fs.existsSync(lock)).toBe(false);
	});

	// Without its environment, a process's repository is the one its working
	// directory is in, so it still holds the lock here.
	it("keeps the lock for a git process in this repository whose environment and command line cannot be read", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, {
			cwd: repo,
			environ: process.getuid?.() === 0 ? undefined : "unreadable",
		});
		const result = runWithProcs(procs, repo);
		expect(result.status).toBe(2);
		expect(result.stderr).toBe(
			`git-clear-stale-lock: keeping ${fs.realpathSync(lock)}: git process ${FAKE_PID} is running in this repository ()\n`,
		);
		expect(fs.existsSync(lock)).toBe(true);
	});

	// As before: with neither its working directory nor its environment, a
	// process's repository is unknown, and it is skipped like any other
	// user's process.
	it("skips a git process whose working directory and environment cannot be read", () => {
		const repo = makeRepo();
		const lock = makeLock(path.join(repo, ".git", "index.lock"));
		const procs = makeProcRoot();
		makeFakeProc(procs, {});
		const result = runWithProcs(procs, repo);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(fs.existsSync(lock)).toBe(false);
	});

	describe("an invalid extra process table", () => {
		const cases: [string, (repo: string) => string][] = [
			[
				"starting with -",
				(repo) => {
					fs.mkdirSync(path.join(repo, "-x"));
					return "-x";
				},
			],
			[
				"relative",
				(repo) => {
					fs.mkdirSync(path.join(repo, "procs"));
					return "procs";
				},
			],
			["nonexistent", (repo) => path.join(path.dirname(repo), "no-such-procs")],
			[
				"a file",
				(repo) => {
					const file = path.join(path.dirname(repo), "procs-file");
					fs.writeFileSync(file, "");
					return file;
				},
			],
			["the root directory", () => "/"],
			// Searchable but not listable (root could list it anyway).
			...(process.getuid?.() === 0
				? []
				: ([
						[
							"unreadable",
							(repo: string) => {
								const dir = path.join(path.dirname(repo), "procs-unreadable");
								fs.mkdirSync(dir, { mode: 0o300 });
								return dir;
							},
						],
					] as [string, (repo: string) => string][])),
		];
		it.each(
			cases,
		)("is a usage error (%s), and the held lock is kept", (_label, makeRoot) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			holdOpen(lock);
			const root = makeRoot(repo);
			const result = runWithProcs(root, repo);
			// Let the cleanup list the unreadable case's directory again.
			if (root.startsWith(`${path.dirname(repo)}/`) && fs.existsSync(root))
				fs.chmodSync(root, 0o700);
			expect(result.status).toBe(1);
			expect(result.stderr).toMatch(/CLASSICY_EXTRA_PROC_ROOT/);
			expect(result.stdout).not.toMatch(/remove/);
			expect(fs.existsSync(lock)).toBe(true);
		});
	});

	// The scan's argument list must not grow with the number of processes:
	// passed one argument each, these overflow ARG_MAX (E2BIG), and a scan
	// that could not run found nothing.
	describe.skipIf(!(ARG_MAX > 0 && ARG_MAX <= 8 * 1024 * 1024))(
		"an extra process table larger than ARG_MAX",
		() => {
			it("still finds a process holding the lock open", {
				timeout: 120_000,
			}, () => {
				const repo = makeRepo();
				const lock = makeLock(path.join(repo, ".git", "index.lock"));
				const holder = holdOpen(lock);
				const result = runWithProcs(getHugeProcRoot(), repo);
				expect(result.status).toBe(2);
				expect(result.stderr).toMatch(
					new RegExp(`held open by pid ${holder.pid}$`, "m"),
				);
				expect(fs.existsSync(lock)).toBe(true);
			});

			it("still finds a git process in this repository", {
				timeout: 120_000,
			}, () => {
				const repo = makeRepo();
				const lock = makeLock(path.join(repo, ".git", "index.lock"));
				const busy = spawn("git", ["hash-object", "--stdin"], {
					cwd: repo,
					env: gitEnv(),
				});
				children.push(busy);
				waitForProc(busy);
				const result = runWithProcs(getHugeProcRoot(), repo);
				expect(result.status).toBe(2);
				expect(result.stderr).toMatch(
					new RegExp(`git process ${busy.pid} is running`),
				);
				expect(fs.existsSync(lock)).toBe(true);
			});
		},
	);

	describe("a scan for holders that fails", () => {
		const realFind = () => realBinary("find");
		const cases: [string, () => string][] = [
			["cannot start", () => 'echo "find: unknown predicate" >&2\nexit 1'],
			["exits with an error", () => `"${realFind()}" "$@"\nexit 2`],
			[
				"prints something unexpected",
				() => `"${realFind()}" "$@"\necho surprise`,
			],
			["is killed", () => "kill -KILL $$"],
			["exits 1 and prints nothing", () => "exit 1"],
		];
		it.each(cases)("refuses when find %s", (_label, body) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const result = runWithEnv({ PATH: makeFakeBin({ find: body() }) }, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(
				`git-clear-stale-lock: keeping ${fs.realpathSync(lock)}: could not scan for processes holding it open\n`,
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("passes through the real find unchanged", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const result = runWithEnv(
				{ PATH: makeFakeBin({ find: `exec "${realFind()}" "$@"` }) },
				repo,
			);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});
	});

	// Other users' processes (unreadable fd directories) and exited ones make
	// find exit 1; that is the normal state of /proc, not a failed scan.
	it.skipIf(process.getuid?.() === 0)(
		"does not refuse over processes whose descriptors cannot be read",
		() => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { comm: "sleep", cwd: os.tmpdir() });
			fs.chmodSync(path.join(procs, FAKE_PID, "fd"), 0o000);
			const result = runWithProcs(procs, repo);
			fs.chmodSync(path.join(procs, FAKE_PID, "fd"), 0o700);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		},
	);

	// The process sets are read at each guard, as late as they can be: a
	// process that appears while guards 1-3 run (here, during their stat
	// calls) is still seen.
	describe("a process that starts while the lock is checked", () => {
		const fakeStat = (setup: string) =>
			makeFakeBin({
				stat: `p="$FAKE_PROCS/${FAKE_PID}"\n[ -e "$p" ] || { ${setup}; }\nexec "${realBinary("stat")}" "$@"`,
			});

		it("is seen as a git process in this repository", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_PROCS: procs,
					FAKE_REPO: repo,
					PATH: fakeStat(
						'mkdir -p "$p/fd"; echo git >"$p/comm"; ln -s "$FAKE_REPO" "$p/cwd"',
					),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${FAKE_PID} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("is seen holding the lock open", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_PROCS: procs,
					FAKE_LOCK: fs.realpathSync(lock),
					PATH: fakeStat(
						'mkdir -p "$p/fd"; echo sleep >"$p/comm"; ln -s "$FAKE_LOCK" "$p/fd/3"',
					),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`held open by pid ${FAKE_PID}$`, "m"),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});
	});

	// With too few file descriptors, every open, pipe and command substitution
	// can fail, and bash substitutes nothing for one it cannot start, with
	// status 0. Nothing the scans then miss may let the lock go.
	describe("with too few file descriptors", () => {
		const limits = [4, 5, 6, 7, 8, 9, 10, 11, 12];

		it.each(limits)("keeps a held lock at ulimit -n %i", (limit) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			holdOpen(lock);
			const result = runUnderFdLimit(limit, repo, "--dry-run");
			expect(result.stdout).not.toMatch(/remove/);
			expect([1, 2]).toContain(result.status);
			if (limit >= 6) expect(result.status).toBe(2);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it.each(
			limits,
		)("keeps the lock while git runs in the repository at ulimit -n %i", (limit) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const busy = spawn("git", ["hash-object", "--stdin"], {
				cwd: repo,
				env: gitEnv(),
			});
			children.push(busy);
			waitForProc(busy);
			const result = runUnderFdLimit(limit, repo, "--dry-run");
			expect(result.stdout).not.toMatch(/remove/);
			expect([1, 2]).toContain(result.status);
			if (limit >= 6) expect(result.status).toBe(2);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("still removes an unheld lock with a normal limit", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const result = runUnderFdLimit(1024, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});
	});

	describe("a scan error that is not an unreadable or exited process", () => {
		const scanFailed = (lock: string, what: string) =>
			`git-clear-stale-lock: keeping ${fs.realpathSync(lock)}: could not scan for ${what}\n`;

		it("refuses when find reports any other error", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const find = realBinary("find");
			const result = runWithEnv(
				{
					PATH: makeFakeBin({
						find: `"${find}" "$@"\necho "find: '/proc/1/fd': Too many open files" >&2\nexit 1`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "processes holding it open"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("accepts find's errors for unreadable and exited processes", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const find = realBinary("find");
			const result = runWithEnv(
				{
					PATH: makeFakeBin({
						find: [
							`"${find}" "$@"`,
							`echo "find: '/proc/1/fd': Permission denied" >&2`,
							`echo "find: '/proc/2/fd/3': No such file or directory" >&2`,
							`echo "find: '/proc/3/attr': No such process" >&2`,
							"exit 1",
						].join("\n"),
					}),
				},
				repo,
			);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		// comm is world-readable, so a process whose comm cannot be opened
		// while it is still there is one the scan failed to read.
		it.skipIf(process.getuid?.() === 0)(
			"refuses when a running process's name cannot be read",
			() => {
				const repo = makeRepo();
				const lock = makeLock(path.join(repo, ".git", "index.lock"));
				const procs = makeProcRoot();
				makeFakeProc(procs, { cwd: repo });
				fs.chmodSync(path.join(procs, FAKE_PID, "comm"), 0o000);
				const result = runWithProcs(procs, repo);
				expect(result.status).toBe(2);
				expect(result.stderr).toBe(scanFailed(lock, "git processes"));
				expect(fs.existsSync(lock)).toBe(true);
			},
		);

		// Its files vanish (ENOENT, or ESRCH while it is reaped) before its
		// directory does.
		it("skips a process whose name vanishes while it exits", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: repo });
			fs.rmSync(path.join(procs, FAKE_PID, "comm"));
			fs.symlinkSync("gone", path.join(procs, FAKE_PID, "comm"));
			const result = runWithProcs(procs, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it("refuses when a running process's name fails to read otherwise", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: repo });
			fs.rmSync(path.join(procs, FAKE_PID, "comm"));
			// A directory opens, then fails to read (EISDIR).
			fs.mkdirSync(path.join(procs, FAKE_PID, "comm"));
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("skips a git process that is being reaped", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: repo });
			const readlink = realBinary("readlink");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_PROCS: procs,
					PATH: makeFakeBin({
						readlink: `case "$3" in "$FAKE_PROCS"/*) echo "readlink: $3: No such process" >&2; exit 1 ;; esac\nexec "${readlink}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it("reads a name without a trailing newline", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: repo });
			fs.writeFileSync(path.join(procs, FAKE_PID, "comm"), "git");
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${FAKE_PID} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("refuses when a git process's working directory fails to read otherwise", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {});
			// Not a link: readlink fails with EINVAL.
			fs.mkdirSync(path.join(procs, FAKE_PID, "cwd"));
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("refuses when a git process's environment fails to read otherwise", () => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: other });
			// A directory opens, then fails to read (EISDIR).
			fs.mkdirSync(path.join(procs, FAKE_PID, "environ"));
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("refuses when git fails to name a process's repository otherwise", () => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: other, environ: ["PATH=/usr/bin"] });
			const git = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_OTHER: other,
					PATH: makeFakeBin({
						git: `[ "$2" = "$FAKE_OTHER" ] && { echo "fatal: Too many open files" >&2; exit 128; }\nexec "${git}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		// git may say "not a git repository" when it cannot open the files that
		// say otherwise; inside this checkout that cannot be true.
		it.each([
			["work tree", (repo: string) => fs.realpathSync(repo)],
		])("refuses when git puts a process in this checkout's %s in no repository", (_label, cwdOf) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			const cwd = cwdOf(repo);
			makeFakeProc(procs, { cwd, environ: ["PATH=/usr/bin"] });
			const git = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_CWD: cwd,
					PATH: makeFakeBin({
						git: `[ "$2" = "$FAKE_CWD" ] && { echo "fatal: not a git repository (or any of the parent directories): .git" >&2; exit 128; }\nexec "${git}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		// A bare repository has no work tree; its git dir is checked alone.
		it("refuses when git puts a process in a bare repository in no repository", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const bare = path.join(dir, "bare.git");
			git(dir, "init", "-q", "--bare", bare);
			const lock = makeLock(path.join(bare, "index.lock"));
			const procs = makeProcRoot();
			const cwd = fs.realpathSync(bare);
			makeFakeProc(procs, { cwd, environ: ["PATH=/usr/bin"] });
			const realGit = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_CWD: cwd,
					PATH: makeFakeBin({
						git: `[ "$2" = "$FAKE_CWD" ] && { echo "fatal: not a git repository (or any of the parent directories): .git" >&2; exit 128; }\nexec "${realGit}" "$@"`,
					}),
				},
				bare,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("fails when git cannot name the work tree", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const git = realBinary("git");
			const result = runWithEnv(
				{
					PATH: makeFakeBin({
						git: `[ "$4" = --show-toplevel ] && { echo "fatal: Too many open files" >&2; exit 128; }\nexec "${git}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(1);
			expect(result.stderr).toMatch(/cannot find the work tree/);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("clears a bare repository's lock", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const bare = path.join(dir, "bare.git");
			git(dir, "init", "-q", "--bare", bare);
			const lock = makeLock(path.join(bare, "index.lock"));
			const result = run(bare);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it("keeps the lock while git runs in a repository whose path holds a newline", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const repo = path.join(dir, "nl\nrepo");
			fs.mkdirSync(repo);
			git(repo, "init", "-q");
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const busy = spawn("git", ["hash-object", "--stdin"], {
				cwd: repo,
				env: gitEnv(),
			});
			children.push(busy);
			waitForProc(busy);
			const result = run(repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${busy.pid} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		// Only the newline readlink adds is dropped, not the path's own.
		it("keeps the lock while git runs in a repository whose path ends in a newline", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const repo = path.join(dir, "repo\n");
			fs.mkdirSync(repo);
			git(repo, "init", "-q");
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const busy = spawn("git", ["hash-object", "--stdin"], {
				cwd: repo,
				env: gitEnv(),
			});
			children.push(busy);
			waitForProc(busy);
			const result = run(repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${busy.pid} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		// The git dir itself ends in a newline: git's own output keeps it.
		it("keeps the lock while git runs in a bare repository whose name ends in a newline", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const bare = path.join(dir, "bare.git\n");
			git(dir, "init", "-q", "--bare", bare);
			const lock = makeLock(path.join(bare, "index.lock"));
			const busy = spawn("git", ["hash-object", "--stdin"], {
				cwd: bare,
				env: gitEnv(),
			});
			children.push(busy);
			waitForProc(busy);
			const result = run(bare);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${busy.pid} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		// A linked worktree's .git is a gitfile, which git follows to the
		// worktree's own git dir.
		it("follows a GIT_DIR that is a linked worktree's gitfile", () => {
			const repo = makeRepo();
			const worktree = path.join(path.dirname(repo), "wt");
			git(repo, "worktree", "add", "-q", "-b", "wt", worktree);
			const worktreeLock = makeLock(
				path.join(repo, ".git", "worktrees", "wt", "index.lock"),
			);
			const mainLock = makeLock(path.join(repo, ".git", "index.lock"));
			const busy = spawn("git", ["hash-object", "--stdin"], {
				cwd: os.tmpdir(),
				env: { ...gitEnv(), GIT_DIR: path.join(worktree, ".git") },
			});
			children.push(busy);
			waitForProc(busy);
			const kept = run(worktree);
			expect(kept.status).toBe(2);
			expect(kept.stderr).toMatch(
				new RegExp(`git process ${busy.pid} is running in this repository`),
			);
			expect(fs.existsSync(worktreeLock)).toBe(true);
			// The main checkout's git dir is another one.
			const cleared = run(repo);
			expect(cleared.stderr).toBe("");
			expect(cleared.status).toBe(0);
			expect(fs.existsSync(mainLock)).toBe(false);
		});

		// An absolute GIT_DIR names the repository whatever the working
		// directory, even one that has been deleted.
		it("follows an absolute GIT_DIR from a deleted working directory", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: path.join(procs, "gone (deleted)"),
				environ: [`GIT_DIR=${path.join(repo, ".git")}`],
			});
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${FAKE_PID} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("follows a GIT_DIR whose path holds a newline", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-lock-"));
			tempDirs.push(dir);
			const repo = path.join(dir, "nl\nrepo");
			fs.mkdirSync(repo);
			git(repo, "init", "-q");
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: os.tmpdir(),
				environ: ["PATH=/usr/bin", `GIT_DIR=${path.join(repo, ".git")}`],
			});
			const result = runWithProcs(procs, repo);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${FAKE_PID} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("ignores git's warnings when it names a repository", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: repo, environ: ["PATH=/usr/bin"] });
			const realGit = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					PATH: makeFakeBin({
						git: `"${realGit}" "$@"\nrc=$?\necho "warning: something" >&2\nexit $rc`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(
				new RegExp(`git process ${FAKE_PID} is running in this repository`),
			);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("skips a git process whose GIT_DIR inside this checkout does not exist", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: os.tmpdir(),
				environ: [`GIT_DIR=${path.join(fs.realpathSync(repo), "missing")}`],
			});
			const result = runWithProcs(procs, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		// Without a GIT_DIR, git reads a gitfile only where one is the .git of
		// the directory; "invalid gitfile format" there is not trusted.
		it("refuses when git calls a working directory's gitfile invalid", () => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: other, environ: ["PATH=/usr/bin"] });
			const realGit = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_OTHER: fs.realpathSync(other),
					PATH: makeFakeBin({
						git: `[ "$2" = "$FAKE_OTHER" ] && { echo "fatal: invalid gitfile format: $2/.git" >&2; exit 128; }\nexec "${realGit}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		// What names a process's repository is its environment, not the
		// script's: a GIT_DIR the script inherits must not leak into it.
		it("resolves a process's repository without the script's own GIT_DIR", () => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: other, environ: ["PATH=/usr/bin"] });
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					GIT_DIR: path.join(repo, ".git"),
				},
				repo,
			);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it("refuses when git puts a GIT_DIR in this checkout in no repository", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			const gitDir = fs.realpathSync(path.join(repo, ".git"));
			makeFakeProc(procs, { cwd: os.tmpdir(), environ: [`GIT_DIR=${gitDir}`] });
			const realGit = realBinary("git");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_GIT_DIR: gitDir,
					PATH: makeFakeBin({
						git: `[ "\${GIT_DIR:-}" = "$FAKE_GIT_DIR" ] && { echo "fatal: not a git repository: '$GIT_DIR'" >&2; exit 128; }\nexec "${realGit}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		// git is asked again for the reason it failed; an answer that changed
		// in between cannot be trusted either way.
		it("refuses when git fails and then succeeds for the same process", () => {
			const repo = makeRepo();
			const other = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: other, environ: ["PATH=/usr/bin"] });
			const realGit = realBinary("git");
			const state = path.join(procs, "git-calls");
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					FAKE_OTHER: fs.realpathSync(other),
					FAKE_STATE: state,
					PATH: makeFakeBin({
						git: `if [ "$2" = "$FAKE_OTHER" ] && [ ! -e "$FAKE_STATE" ]; then : >"$FAKE_STATE"; exit 128; fi\nexec "${realGit}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toBe(scanFailed(lock, "git processes"));
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("skips a git process outside any repository", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const outside = makeProcRoot();
			const procs = makeProcRoot();
			makeFakeProc(procs, { cwd: outside, environ: ["PATH=/usr/bin"] });
			const result = runWithEnv(
				{
					CLASSICY_EXTRA_PROC_ROOT: procs,
					GIT_CEILING_DIRECTORIES: path.dirname(outside),
				},
				repo,
			);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it("skips a git process whose working directory was deleted", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: path.join(procs, "gone (deleted)"),
				environ: ["PATH=/usr/bin"],
			});
			const result = runWithProcs(procs, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		it.each([
			["is missing", (dir: string) => path.join(dir, "missing")],
			[
				"is a file but not a gitfile",
				(dir: string) => {
					fs.writeFileSync(path.join(dir, "file"), "");
					return path.join(dir, "file");
				},
			],
		])("skips a git process whose GIT_DIR %s", (_label, makeGitDir) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const procs = makeProcRoot();
			makeFakeProc(procs, {
				cwd: os.tmpdir(),
				environ: [`GIT_DIR=${makeGitDir(procs)}`],
			});
			const result = runWithProcs(procs, repo);
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
			expect(fs.existsSync(lock)).toBe(false);
		});

		// What a command substitution that could not start leaves: nothing.
		it.each([
			"%s",
			"%i",
			"%a",
			"%Y",
		])("refuses when stat -c %s prints nothing", (format) => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const stat = realBinary("stat");
			const result = runWithEnv(
				{
					PATH: makeFakeBin({
						stat: `[ "$2" = "${format}" ] && exit 0\nexec "${stat}" "$@"`,
					}),
				},
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(/cannot stat it/);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("refuses when date prints nothing", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const result = runWithEnv(
				{ PATH: makeFakeBin({ date: "exit 0" }) },
				repo,
			);
			expect(result.status).toBe(2);
			expect(result.stderr).toMatch(/cannot read the clock/);
			expect(fs.existsSync(lock)).toBe(true);
		});

		it("fails when git names no git dir", () => {
			const repo = makeRepo();
			const lock = makeLock(path.join(repo, ".git", "index.lock"));
			const result = runWithEnv({ PATH: makeFakeBin({ git: "exit 0" }) }, repo);
			expect(result.status).toBe(1);
			expect(result.stdout).toBe("");
			expect(fs.existsSync(lock)).toBe(true);
		});
	});

	it("fails outside a repository", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classicy-norepo-"));
		tempDirs.push(dir);
		// The ceiling keeps git from finding a repository above the temp dir.
		const result = spawnSync("bash", [SCRIPT], {
			cwd: dir,
			env: { ...gitEnv(), GIT_CEILING_DIRECTORIES: path.dirname(dir) },
			encoding: "utf8",
		});
		expect(result.status).toBe(1);
		expect(result.stderr).toMatch(/not a git repository/);
	});
});
