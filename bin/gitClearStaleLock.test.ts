import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

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
	for (const dir of tempDirs.splice(0))
		fs.rmSync(dir, { recursive: true, force: true });
});

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

// Runs the script with a fake process table beside the real /proc.
const runWithProcs = (procRoot: string, cwd: string, ...args: string[]) =>
	spawnSync("bash", [SCRIPT, ...args], {
		cwd,
		env: { ...gitEnv(), CLASSICY_EXTRA_PROC_ROOT: procRoot },
		encoding: "utf8",
	});

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
