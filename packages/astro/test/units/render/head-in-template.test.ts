import * as assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import { FetchState } from '../../../dist/core/fetch/fetch-state.js';
import {
	createComponent,
	maybeRenderHead,
	render,
	renderComponent,
	renderHead,
	renderSlot,
	templateEnter,
	templateExit,
} from '../../../dist/runtime/server/index.js';
import type { AstroComponentFactory } from '../../../dist/runtime/server/render/index.js';
import type { Pipeline } from '../../../dist/core/render/index.js';
import { createBasicPipeline, renderThroughMiddleware } from '../test-utils.ts';

const createAstroModule = (AstroComponent: AstroComponentFactory) => ({ default: AstroComponent });

describe('head rendering with <template> elements', () => {
	let pipeline: Pipeline;

	before(async () => {
		pipeline = createBasicPipeline();
		pipeline.headElements = () => ({
			links: new Set(),
			scripts: new Set(),
			styles: new Set([
				{ props: { 'data-vite-dev-id': '/src/global.css' }, children: '.global { color: red }' },
			]),
		});
	});

	async function renderPage(Component: AstroComponentFactory) {
		const request = new Request('http://example.com/');
		const routeData = {
			type: 'page',
			pathname: '/index',
			component: 'src/pages/index.astro',
			params: {},
		};
		const state = new FetchState(pipeline, request);
		state.routeData = routeData as any;
		state.pathname = '/index';
		const response = await renderThroughMiddleware(state, createAstroModule(Component));
		return cheerio.load(await response.text());
	}

	it('does not inject head styles inside a <template> element', async () => {
		// Simulates: Layout has <head> containing a <template> with child components.
		// The child components call maybeRenderHead() inside the template context.
		// The bug was: when headInTree was incorrectly false, maybeRenderHead() would
		// fire inside the template, trapping all styles inside the inert template element.

		// Icon-like component that renders an SVG (calls maybeRenderHead before non-head content)
		const Icon = createComponent(() => {
			return render`${maybeRenderHead()}<svg class="icon" viewBox="0 0 24 24"></svg>`;
		});

		// ThemeProvider-like component with a <template> wrapping Icon components
		const ThemeProvider = createComponent((result: any) => {
			return render`<template id="theme-icons">${templateEnter(result)}${renderComponent(result, 'Icon', Icon, {}, {})}${templateExit(result)}</template>`;
		});

		// Layout with explicit <head> containing ThemeProvider
		const Layout = createComponent((result: any, _props: any, slots: any) => {
			return render`<html><head>${renderComponent(result, 'ThemeProvider', ThemeProvider, {}, {})}${renderHead()}</head><body>${renderSlot(result, slots['default'])}</body></html>`;
		});

		// Page using the layout
		const Page = createComponent((result: any) => {
			return render`${renderComponent(result, 'Layout', Layout, {}, {
				default: () => render`${maybeRenderHead()}<div>Page content</div>`,
			})}`;
		});

		const $ = await renderPage(Page);

		const html = $.html();

		// Styles should be in the <head>, NOT inside the <template>
		assert.equal($('head > style[data-vite-dev-id]').length, 1, 'Style should be directly in head');

		// The template element should NOT contain any style tags
		const templateStart = html.indexOf('<template');
		const templateEnd = html.indexOf('</template>');
		const templateContent = html.substring(templateStart, templateEnd);
		assert.equal(templateContent.includes('<style'), false, 'No styles should be inside template');

		// Template should contain the SVG icon
		assert.equal(templateContent.includes('svg'), true, 'Icon SVG should be inside template');

		// Page content should be in body
		assert.equal($('body div').text(), 'Page content');
	});

	it('templateDepth guard prevents styles from leaking into template even without headInTree', async () => {
		// When headInTree is false (e.g. containsHead propagation didn't reach this page),
		// maybeRenderHead() fires — but the templateDepth guard ensures it doesn't render
		// inside a <template> element. Styles should still end up in the right place.

		const Icon = createComponent(() => {
			return render`${maybeRenderHead()}<svg class="icon"></svg>`;
		});

		const ThemeProvider = createComponent((result: any) => {
			return render`<template id="icons">${templateEnter(result)}${renderComponent(result, 'Icon', Icon, {}, {})}${templateExit(result)}</template>`;
		});

		const Layout = createComponent((result: any, _props: any, slots: any) => {
			return render`<html><head>${renderComponent(result, 'ThemeProvider', ThemeProvider, {}, {})}${renderHead()}</head><body>${renderSlot(result, slots['default'])}</body></html>`;
		});

		const Page = createComponent((result: any) => {
			return render`${renderComponent(result, 'Layout', Layout, {}, {
				default: () => render`${maybeRenderHead()}<main>Hello</main>`,
			})}`;
		});

		const $ = await renderPage(Page);

		// Verify styles are in head, not in template
		assert.equal($('head > style').length >= 1, true, 'At least one style in head');
		assert.equal($('template style').length, 0, 'No styles leaked into template');
		assert.equal($('main').text(), 'Hello');
	});
});
