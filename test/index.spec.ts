// test/index.spec.ts
import { env, SELF } from 'cloudflare:test';
import { beforeAll, expect, test } from 'vitest';

beforeAll(async () => {
	// Seed test pantry
	/* @ts-ignore */
	await env.TEST_PANTRY_ID.put('__details__', JSON.stringify({ name: 'Test Pantry', description: 'Test Pantry Description' }));
	/* @ts-ignore */
	await env.TEST_PANTRY_ID.put('defaultBasket', JSON.stringify({ city: 'New York' }));
	/* @ts-ignore */
	await env.TEST_PANTRY_ID.put('deleteBasket', JSON.stringify({ city: 'Denver' }));
	/* @ts-ignore */
	await env.TEST_PANTRY_ID.put('replaceBasket', JSON.stringify({ city: 'Chicago' }));
});

const unknownPaths = ['/', '/apiv1/pantry', 'apiv1/pantry/123/basket', '/apiv1/pantry/123/basket/456/extra'];
const methods = ['GET', 'POST', 'PUT', 'DELETE'];
const unknownRequestMatrix = unknownPaths.flatMap((path) => methods.map((method) => [path, method]));
test.each(unknownRequestMatrix)('Unknown routes should return 404: %s %s', async (path, method) => {
	const response = await SELF.fetch(`https://nook-worker.com${path}`, { method });
	expect(response.status).toBe(404);
});

test('GET non-existent pantry should return 400', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/1234', { method: 'GET' });
	expect(response.status).toBe(400);
	expect(await response.text()).toBe('Could not get pantry: pantry with id: 1234 not found');
});

test('GET pantry details should return the default details', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID', { method: 'GET' });
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body).toEqual({
		name: 'Test Pantry',
		description: 'Test Pantry Description',
		errors: [],
		notifications: false,
		percentFull: 0,
		baskets: [
			{
				name: 'defaultBasket',
				ttl: -1,
			},
			{
				name: 'deleteBasket',
				ttl: -1,
			},
			{
				name: 'replaceBasket',
				ttl: -1,
			},
		],
	});
});

test('PUT pantry details should update the pantry details', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID', {
		method: 'PUT',
		body: JSON.stringify({ name: 'New Name', description: 'New Description' }),
	});
	expect(response.status).toBe(200);

	const getDetailsResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID', { method: 'GET' });
	expect(getDetailsResponse.status).toBe(200);
	const body = await getDetailsResponse.json();
	expect(body).toEqual({
		name: 'New Name',
		description: 'New Description',
		errors: [],
		notifications: false,
		percentFull: 0,
		baskets: [
			{
				name: 'defaultBasket',
				ttl: -1,
			},
			{
				name: 'deleteBasket',
				ttl: -1,
			},
			{
				name: 'replaceBasket',
				ttl: -1,
			},
		],
	});
});

test('GET non-existent basket should return 400', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/otherBasket', { method: 'GET' });
	expect(response.status).toBe(400);
	expect(await response.text()).toBe('Could not get basket: otherBasket does not exist');
});

test('POST basket should create a new basket', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/createdBasket', {
		method: 'POST',
		body: JSON.stringify({ key: 'value' }),
	});
	expect(response.status).toBe(200);

	const getBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/createdBasket', { method: 'GET' });
	expect(getBasketResponse.status).toBe(200);
	const body = await getBasketResponse.json();
	expect(body).toEqual({ key: 'value' });
});

test('POST basket should replace an existing basket and its contents', async () => {
	const getBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/replaceBasket', { method: 'GET' });
	expect(getBasketResponse.status).toBe(200);
	expect(await getBasketResponse.json()).toEqual({ city: 'Chicago' });

	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/replaceBasket', {
		method: 'POST',
		body: JSON.stringify({ animal: 'dog' }),
	});
	expect(response.status).toBe(200);

	const replacedBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/replaceBasket', {
		method: 'GET',
	});
	expect(replacedBasketResponse.status).toBe(200);
	expect(await replacedBasketResponse.json()).toEqual({ animal: 'dog' });
});

test('PUT basket should update an existing basket and deep merge', async () => {
	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/defaultBasket', {
		method: 'PUT',
		body: JSON.stringify({ state: 'NY' }),
	});
	expect(response.status).toBe(200);

	const getBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/defaultBasket', { method: 'GET' });
	expect(getBasketResponse.status).toBe(200);
	const body = await getBasketResponse.json();
	expect(body).toEqual({ city: 'New York', state: 'NY' });
});

test('DELETE basket should remove an existing basket', async () => {
	// Check that the basket exists
	const getInitialBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/deleteBasket', {
		method: 'GET',
	});
	expect(getInitialBasketResponse.status).toBe(200);
	expect(await getInitialBasketResponse.json()).toEqual({ city: 'Denver' });

	const response = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/deleteBasket', { method: 'DELETE' });
	expect(response.status).toBe(200);

	const getDeletedBasketResponse = await SELF.fetch('https://nook-worker.com/apiv1/pantry/TEST_PANTRY_ID/basket/deleteBasket', {
		method: 'GET',
	});
	expect(getDeletedBasketResponse.status).toBe(400);
	expect(await getDeletedBasketResponse.text()).toBe('Could not get basket: deleteBasket does not exist');
});
