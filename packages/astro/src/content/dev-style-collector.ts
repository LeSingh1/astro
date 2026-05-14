/**
 * Dev-only registry for dynamic style collection from content entries.
 *
 * In dev mode, content entry styles need to be collected fresh at render time
 * (not baked at transform time) because the Vite module graph may not be fully
 * populated when the ?astroPropagatedAssets module is first transformed.
 *
 * The astro:content-asset-propagation plugin registers a collector function for
 * each content entry at transform time. The Content component calls
 * `collectStylesForContentEntry()` at render time to get fresh styles.
 *
 * We use globalThis to share the registry between the Vite plugin (which runs
 * in the main Node.js context) and the SSR runtime (which runs in Vite's module
 * runner and has its own module cache).
 */

type StyleCollectorFn = () => Promise<{ styles: string[]; urls: string[] }>;

const REGISTRY_KEY = Symbol.for('astro.dev-style-collector');

function getRegistry(): Map<string, StyleCollectorFn> {
	let registry = (globalThis as any)[REGISTRY_KEY];
	if (!registry) {
		registry = new Map<string, StyleCollectorFn>();
		(globalThis as any)[REGISTRY_KEY] = registry;
	}
	return registry;
}

/**
 * Register a style collector function for a content entry.
 * Called by the astro:content-asset-propagation plugin at transform time.
 */
export function registerStyleCollector(basePath: string, collector: StyleCollectorFn): void {
	getRegistry().set(basePath, collector);
}

/**
 * Collect styles for a content entry at render time.
 * Returns fresh styles by crawling the current Vite module graph.
 */
export async function collectStylesForContentEntry(
	basePath: string,
): Promise<{ styles: string[]; urls: string[] }> {
	const collector = getRegistry().get(basePath);
	if (!collector) {
		return { styles: [], urls: [] };
	}
	return collector();
}
