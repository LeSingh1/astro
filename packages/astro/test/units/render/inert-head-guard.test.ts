import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkToString } from '../../../dist/runtime/server/render/common.js';
import { createRenderInstruction } from '../../../dist/runtime/server/render/instruction.js';

function createStubResult(overrides?: { headInTree?: boolean; hasRenderedHead?: boolean }) {
	return {
		styles: new Set([
			{
				props: { 'data-vite-dev-id': '/src/global.css' },
				children: 'body { color: red }',
			},
		]),
		scripts: new Set(),
		links: new Set(),
		shouldInjectCspMetaTags: false,
		cspDestination: 'meta',
		base: '/',
		userAssetsBase: undefined,
		clientDirectives: new Map(),
		componentMetadata: new Map(),
		_metadata: {
			hasHydrationScript: false,
			rendererSpecificHydrationScripts: new Set<string>(),
			hasRenderedHead: overrides?.hasRenderedHead ?? false,
			renderedScripts: new Set<string>(),
			hasDirectives: new Set<string>(),
			hasRenderedServerIslandRuntime: false,
			headInTree: overrides?.headInTree ?? false,
			extraHead: [],
			extraStyleHashes: [],
			extraScriptHashes: [],
			propagators: new Set(),
			templateDepth: 0,
		},
		partial: false,
	};
}

describe('head/maybe-head guard inside <template>', () => {
	it('does not render head content inside a template element', () => {
		const result = createStubResult();
		result._metadata.templateDepth = 1;

		const instruction = createRenderInstruction({ type: 'maybe-head' });
		const output = chunkToString(result as any, instruction).toString();

		// Head content should NOT be rendered inside a template
		assert.equal(output, '');
		// hasRenderedHead should remain false since we didn't render
		assert.equal(result._metadata.hasRenderedHead, false);
		// Styles should NOT be cleared
		assert.equal(result.styles.size, 1);
	});

	it('renders head content outside a template element', () => {
		const result = createStubResult();
		result._metadata.templateDepth = 0;

		const instruction = createRenderInstruction({ type: 'maybe-head' });
		const output = chunkToString(result as any, instruction).toString();

		// Head content SHOULD be rendered outside a template
		assert.match(output, /body \{ color: red \}/);
		assert.equal(result._metadata.hasRenderedHead, true);
		assert.equal(result.styles.size, 0);
	});

	it('does not render explicit head instruction inside a template element', () => {
		const result = createStubResult({ headInTree: true });
		result._metadata.templateDepth = 1;

		const instruction = createRenderInstruction({ type: 'head' });
		const output = chunkToString(result as any, instruction).toString();

		assert.equal(output, '');
		assert.equal(result._metadata.hasRenderedHead, false);
		assert.equal(result.styles.size, 1);
	});

	it('preserves head content for rendering after exiting template', () => {
		const result = createStubResult();

		// Simulate entering a template
		const enterInstruction = createRenderInstruction({ type: 'template-enter' });
		chunkToString(result as any, enterInstruction);
		assert.equal(result._metadata.templateDepth, 1);

		// maybe-head fires inside template — should be suppressed
		const maybeHeadInstruction = createRenderInstruction({ type: 'maybe-head' });
		const innerOutput = chunkToString(result as any, maybeHeadInstruction).toString();
		assert.equal(innerOutput, '');
		assert.equal(result._metadata.hasRenderedHead, false);

		// Exit the template
		const exitInstruction = createRenderInstruction({ type: 'template-exit' });
		chunkToString(result as any, exitInstruction);
		assert.equal(result._metadata.templateDepth, 0);

		// Now maybe-head fires outside template — should render the styles
		const outerOutput = chunkToString(result as any, maybeHeadInstruction).toString();
		assert.match(outerOutput, /body \{ color: red \}/);
		assert.equal(result._metadata.hasRenderedHead, true);
	});
});
