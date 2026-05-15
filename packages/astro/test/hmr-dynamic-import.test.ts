import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import { type DevServer, type Fixture, isWindows, loadFixture } from './test-utils.ts';

describe('HMR: dynamic import() components', () => {
	let fixture: Fixture;
	let devServer: DevServer;

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/hmr-dynamic-import/',
			outDir: './dist/hmr-dynamic-import/',
		});
		devServer = await fixture.startDevServer();
	});

	after(async () => {
		await devServer.stop();
		fixture.resetAllFiles();
	});

	it('should reflect HTML changes in dynamically imported components', {
		skip: isWindows,
	}, async () => {
		// Initial fetch - verify correct rendering
		let res = await fixture.fetch('/');
		assert.equal(res.status, 200);
		let $ = cheerio.load(await res.text());
		assert.equal($('#dynamic-content p').text(), 'initial');

		// Edit the dynamically imported component's HTML
		await fixture.editFile('/src/components/MyComponent.astro', (content) =>
			content.replace('<p>initial</p>', '<p>updated</p>'),
		);
		await new Promise((r) => setTimeout(r, 1000));

		// Fetch again after edit - should see the updated content
		res = await fixture.fetch('/');
		assert.equal(res.status, 200);
		$ = cheerio.load(await res.text());
		assert.equal(
			$('#dynamic-content p').text(),
			'updated',
			'Dynamic import component HTML should update after edit without server restart',
		);
	});
});
