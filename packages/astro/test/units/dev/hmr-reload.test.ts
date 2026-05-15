import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import hmrReload from '../../../dist/vite-plugin-hmr-reload/index.js';

/**
 * Creates a minimal mock of the EnvironmentModuleNode for testing.
 */
function createMockModule(id: string, file?: string) {
	return {
		id,
		file: file ?? id,
		importers: new Set(),
		importedModules: new Set(),
		acceptedHmrDeps: new Set(),
	} as any;
}

/**
 * Creates the mock context and arguments for calling the hotUpdate handler.
 */
function createHotUpdateContext({
	environmentName = 'ssr',
	modules = [] as any[],
	clientModuleIds = new Set<string>(),
}: {
	environmentName?: string;
	modules?: any[];
	clientModuleIds?: Set<string>;
}) {
	const wsSent: any[] = [];
	const invalidatedModules: any[] = [];

	const environment = {
		name: environmentName,
		moduleGraph: {
			invalidateModule(mod: any, seen?: Set<any>, _timestamp?: number, _isHmr?: boolean) {
				invalidatedModules.push(mod);
				if (seen) seen.add(mod);
			},
			getModuleById(_id: string) {
				return undefined;
			},
		},
	};

	const server = {
		ws: {
			send(payload: any) {
				wsSent.push(payload);
			},
		},
		environments: {
			client: {
				moduleGraph: {
					getModuleById(id: string) {
						return clientModuleIds.has(id) ? { id } : undefined;
					},
				},
			},
		},
	};

	const handlerArgs = {
		modules,
		server,
		timestamp: Date.now(),
	};

	return {
		environment,
		server,
		handlerArgs,
		wsSent,
		invalidatedModules,
	};
}

describe('astro:hmr-reload', () => {
	it('returns SSR-only modules so Vite propagates invalidation to the module runner', () => {
		const plugin = hmrReload();
		const hotUpdate = (plugin as any).hotUpdate;
		const handler = typeof hotUpdate === 'object' ? hotUpdate.handler : hotUpdate;

		const ssrModule = createMockModule('/src/components/Button.astro');
		const { environment, handlerArgs, wsSent } = createHotUpdateContext({
			environmentName: 'ssr',
			modules: [ssrModule],
		});

		// Call the handler with `this` bound to the mock plugin context
		const result = handler.call({ environment }, handlerArgs);

		// The handler should return the SSR-only modules (not an empty array)
		// so that Vite's updateModules() can propagate the invalidation to the
		// SSR module runner's evaluatedModules cache.
		assert.ok(Array.isArray(result), 'handler should return an array');
		assert.equal(result.length, 1, 'should return the SSR-only module');
		assert.equal(result[0], ssrModule, 'should return the exact module reference');

		// Should also send full-reload to the browser
		assert.equal(wsSent.length, 1);
		assert.deepEqual(wsSent[0], { type: 'full-reload' });
	});

	it('returns empty array for style-only modules', () => {
		const plugin = hmrReload();
		const hotUpdate = (plugin as any).hotUpdate;
		const handler = typeof hotUpdate === 'object' ? hotUpdate.handler : hotUpdate;

		const styleModule = createMockModule(
			'/src/components/Button.astro?astro&type=style&index=0&lang.css',
			'/src/components/Button.css',
		);

		const { environment, handlerArgs, wsSent } = createHotUpdateContext({
			environmentName: 'ssr',
			modules: [styleModule],
		});

		const result = handler.call({ environment }, handlerArgs);

		// Style modules should return [] to prevent unnecessary full reloads
		assert.ok(Array.isArray(result), 'handler should return an array');
		assert.equal(result.length, 0, 'should return empty array for style modules');

		// No full-reload should be sent for style-only changes
		assert.equal(wsSent.length, 0);
	});

	it('skips modules that also exist in the client module graph', () => {
		const plugin = hmrReload();
		const hotUpdate = (plugin as any).hotUpdate;
		const handler = typeof hotUpdate === 'object' ? hotUpdate.handler : hotUpdate;

		const clientAndSsrModule = createMockModule('/src/components/ReactComponent.jsx');
		const { environment, handlerArgs, wsSent } = createHotUpdateContext({
			environmentName: 'ssr',
			modules: [clientAndSsrModule],
			clientModuleIds: new Set(['/src/components/ReactComponent.jsx']),
		});

		const result = handler.call({ environment }, handlerArgs);

		// Client modules should not cause a full-reload from SSR side
		assert.equal(result, undefined, 'should return undefined when no SSR-only modules');
		assert.equal(wsSent.length, 0);
	});

	it('does nothing for non-SSR environments', () => {
		const plugin = hmrReload();
		const hotUpdate = (plugin as any).hotUpdate;
		const handler = typeof hotUpdate === 'object' ? hotUpdate.handler : hotUpdate;

		const mod = createMockModule('/src/components/Button.astro');
		const { environment, handlerArgs } = createHotUpdateContext({
			environmentName: 'client',
			modules: [mod],
		});

		const result = handler.call({ environment }, handlerArgs);

		assert.equal(result, undefined, 'should return undefined for non-SSR environments');
	});
});
