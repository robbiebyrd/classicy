// The one pattern both Vite configs (vite.config.ts and
// storybook/.storybook/main.ts) hand VitePluginImageTools as `excludes`, so
// Appearance Package art is never converted to WebP or run through svgo, in the
// library build, the Storybook build or either dev server. Package art ships
// exactly as authored (Part E uses it as CSS masks, and svgo rewrites the
// window grow-box grip's <rect>s as <path>s that rasterize differently).
//
// Plain erasable TypeScript: both configs and the check script import it.

/**
 * Matches a module id under the in-repo package directory (`src/Appearance/`)
 * and under the packages/ layout Platinum is moving to
 * (`packages/appearance/<package>/`).
 */
export const CLASSICY_IMAGE_TOOLS_EXCLUDES: RegExp =
	/(?:src\/Appearance|packages\/appearance)\//;
