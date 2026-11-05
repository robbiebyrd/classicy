// verify:dist invariant 13: an entry bundle is a production build. A dev JSX
// transform leaves three tells: an import of react/jsx-dev-runtime, calls to
// jsxDEV(), and a `fileName` option on each call naming the build machine's
// absolute source path (which also makes two builds of one source differ).

const MACHINE_PATH = /fileName\s*:\s*["'`](?:\/home\/|\/Users\/|[A-Za-z]:\\)/;

/** Problems with a bundle's JSX runtime, one message per tell found. */
export function findClassicyDevJsxProblems(
	file: string,
	source: string,
	cwd: string,
): string[] {
	const problems: string[] = [];
	const hint = "-> the library must build with the production JSX transform.";
	if (/react\/jsx-dev-runtime/.test(source))
		problems.push(`${file}: references react/jsx-dev-runtime ${hint}`);
	if (/\bjsxDEV\b/.test(source))
		problems.push(`${file}: calls jsxDEV() ${hint}`);
	if (MACHINE_PATH.test(source))
		problems.push(
			`${file}: carries absolute build-machine paths in fileName ${hint}`,
		);
	else if (cwd.length > 1 && source.includes(cwd.replaceAll("\\", "\\\\")))
		problems.push(`${file}: carries the build directory (${cwd}) ${hint}`);
	return problems;
}
