import * as assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import { loadFixture, type DevServer, type Fixture } from './test-utils.ts';

describe('Content Collections - dev mode CSS', () => {
	let fixture: Fixture;
	let devServer: DevServer;

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/content/',
			outDir: './dist/content-css-dev-test/',
		});
		devServer = await fixture.startDevServer();
	});

	after(async () => {
		await devServer.stop();
	});

	it('Includes scoped styles for .astro components imported in MDX content entries', async () => {
		const res = await fixture.fetch('/blog/5-big-news');
		const html = await res.text();
		const $ = cheerio.load(html);

		// RedButton.astro has a scoped <style> with `button { background-color: red; }`
		const buttons = $('button');
		assert.equal(buttons.length, 1, 'RedButton should render a button element');

		// Check that the scoped style is present
		const allStyles = $('style').text();
		assert.ok(
			allStyles.includes('background-color') && allStyles.includes('red'),
			'Scoped style from RedButton.astro should be present',
		);

		// Check for data-astro-cid attribute (scoped style) on the element
		const cidAttr = Object.keys(buttons.first().attr() || {}).filter((k) =>
			k.startsWith('data-astro-cid-'),
		);
		assert.ok(cidAttr.length > 0, 'Button should have data-astro-cid attribute');
	});

	it('Includes scoped styles from MDX content in a different collection with indirection', async () => {
		// The docs collection uses PostContent.astro as an intermediary component
		const res = await fixture.fetch('/docs/getting-started');
		const html = await res.text();
		const $ = cheerio.load(html);

		const buttons = $('button');
		assert.equal(buttons.length, 1, 'RedButton should render in docs page');

		const allStyles = $('style').text();
		assert.ok(
			allStyles.includes('background-color') && allStyles.includes('red'),
			'Scoped style from RedButton.astro should be present in docs page too',
		);
	});
});
