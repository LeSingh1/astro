import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { type Fixture, loadFixture } from './test-utils.ts';

type IntellisenseManifest = {
	collections: { hasSchema: boolean; name: string }[];
	entries: Record<string, string>;
};

type IntellisenseCollections = Record<
	string,
	Array<{ id: string; data: unknown; filePath: string; collection: string }>
>;

describe('Content Intellisense', () => {
	let fixture: Fixture;

	let collectionsDir: string[] = [];

	let manifest: IntellisenseManifest;

	let collections: IntellisenseCollections;

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/content-intellisense/',
			outDir: './dist/content-intellisense/',
		});
		await fixture.build();

		collectionsDir = await fixture.readdir('../../.astro/collections');
		manifest = JSON.parse(await fixture.readFile('../../.astro/collections/collections.json'));
		collections = JSON.parse(await fixture.readFile('index.json'));
	});

	it('generate JSON schemas for content collections', async () => {
		assert.equal(collectionsDir.includes('blog-cc.schema.json'), true);
	});

	it('generate JSON schemas for content layer', async () => {
		assert.equal(collectionsDir.includes('blog-cl.schema.json'), true);
	});

	it('generate JSON schemas for file loader', async () => {
		assert.equal(collectionsDir.includes('data-cl.schema.json'), true);
	});

	it('generate JSON schemas for data with unrepresentable types', async () => {
		assert.equal(collectionsDir.includes('data-dates.schema.json'), true);
	});

	it('generates a JSON schema for the file loader that validates both object maps and arrays', async () => {
		const schema = JSON.parse(
			await fixture.readFile('../../.astro/collections/data-cl.schema.json'),
		);
		// Schema should use anyOf to support both object-map and array data shapes
		assert.ok(Array.isArray(schema.anyOf), 'Expected schema to have an anyOf array');
		assert.equal(schema.anyOf.length, 2, 'Expected two variants in anyOf');

		// First variant: object map with additionalProperties
		const objectVariant = schema.anyOf.find((v) => v.type === 'object');
		assert.ok(objectVariant, 'Expected an object variant');
		assert.equal(objectVariant.additionalProperties.type, 'object');
		assert.deepEqual(objectVariant.additionalProperties.properties, {
			name: { type: 'string' },
			color: { type: 'string' },
		});
		// Object variant should accept a $schema property
		assert.deepEqual(objectVariant.properties['$schema'], { type: 'string' });

		// Second variant: array of items
		const arrayVariant = schema.anyOf.find((v) => v.type === 'array');
		assert.ok(arrayVariant, 'Expected an array variant');
		assert.equal(arrayVariant.items.type, 'object');
		assert.deepEqual(arrayVariant.items.properties, {
			name: { type: 'string' },
			color: { type: 'string' },
		});
	});

	it('manifest exists', async () => {
		assert.notEqual(manifest, undefined);
	});

	it('manifest has content collections', async () => {
		const manifestCollections = manifest.collections.map((collection) => collection.name);
		assert.equal(
			manifestCollections.includes('blog-cc'),
			true,
			"Expected 'blog-cc' collection in manifest",
		);
	});

	it('manifest has content layer', async () => {
		const manifestCollections = manifest.collections.map((collection) => collection.name);
		assert.equal(
			manifestCollections.includes('blog-cl'),
			true,
			"Expected 'blog-cl' collection in manifest",
		);
	});

	it('has entries for content collections', async () => {
		const collectionEntries = Object.entries(manifest.entries).filter((entry) =>
			entry[0].includes('/packages/astro/test/fixtures/content-intellisense/src/content/blog-cc/'),
		);
		assert.equal(collectionEntries.length, 3, "Expected 3 entries for 'blog-cc' collection");
		assert.equal(
			collectionEntries.every((entry) => entry[1] === 'blog-cc'),
			true,
			"Expected 3 entries for 'blog-cc' collection to have 'blog-cc' as collection",
		);
	});

	it('has entries for content layer', async () => {
		const collectionEntries = Object.entries(manifest.entries).filter((entry) =>
			entry[0].includes('/packages/astro/test/fixtures/content-intellisense/src/blog-cl/'),
		);

		assert.equal(collectionEntries.length, 3, "Expected 3 entries for 'blog-cl' collection");
		assert.equal(
			collectionEntries.every((entry) => entry[1] === 'blog-cl'),
			true,
			"Expected 3 entries for 'blog-cl' collection to have 'blog-cl' as collection name",
		);
	});

	it('doesn’t generate a `$schema` entry for file loader if `$schema` value is a string', async () => {
		assert.equal(collections['data-cl-json'].map((entry) => entry.id).includes('$schema'), false);
	});

	it('generates a `$schema` entry for file loader if `$schema` value isn’t a string', async () => {
		assert.equal(
			collections['data-schema-misuse'].map((entry) => entry.id).includes('$schema'),
			true,
		);
	});

	it('uses the Zod input shape to generate the JSON schema', async () => {
		const schema = JSON.parse(
			await fixture.readFile('../../.astro/collections/io-differences.schema.json'),
		);
		assert.deepEqual(schema.properties.optionalWithDefault, {
			type: 'string',
			default: 'default value',
		});
		// The optional field with a default should bot be required.
		assert.ok(!schema.required.includes('optionalWithDefault'));
	});
});
