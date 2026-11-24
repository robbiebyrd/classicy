// The files an Appearance Package's dist check fixture needs beside its
// dist/ for the server-import invariant (bin/classicyNodeImport.ts): the
// package folder's "type": "module", and stand-ins for what the fixture
// bundles import, `@classicy/classicy` (ES and CommonJS, as the real core's
// exports map has them) and `react/jsx-runtime`. Path → text, relative to
// the fixture package folder; used by both packages' bin/verify-dist.test.ts.
export const CLASSICY_NODE_IMPORT_FIXTURE: Readonly<Record<string, string>> = {
	"package.json": '{"type":"module"}\n',
	"node_modules/@classicy/classicy/package.json": `${JSON.stringify({
		name: "@classicy/classicy",
		type: "module",
		exports: { ".": { import: "./index.js", require: "./index.cjs" } },
	})}\n`,
	"node_modules/@classicy/classicy/index.js":
		"export const registerClassicyAppearancePackage = () => {};\n",
	"node_modules/@classicy/classicy/index.cjs":
		"exports.registerClassicyAppearancePackage = () => {};\n",
	"node_modules/react/package.json": `${JSON.stringify({
		name: "react",
		exports: { "./jsx-runtime": "./jsx-runtime.js" },
	})}\n`,
	"node_modules/react/jsx-runtime.js": "exports.jsx = () => null;\n",
};
