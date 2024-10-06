import { BasketController, PantryController, UpdatePantryDetails } from './controllers';

function isValidPath(path: string): boolean {
	const parts = path.split('/');
	if (parts.length < 4 || parts.length > 6 || parts.length === 5) {
		return false;
	}
	if (parts[1] !== 'apiv1' || parts[2] !== 'pantry') {
		return false;
	}
	return true;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const ttl = env.BASKET_TTL_SECONDS;

		if (!isValidPath(path)) {
			return new Response('Not Found', { status: 404 });
		}

		const method = request.method;
		const parts = path.split('/');
		const pantryId = parts[3];
		const isPantryRequest = parts.length === 4;
		const isBasketRequest = parts.length === 6;

		if (env[pantryId as keyof Env] === undefined) {
			const requestType = isPantryRequest ? 'pantry' : 'basket';
			const errorString = `Could not get ${requestType}: pantry with id: ${pantryId} not found`;
			return new Response(errorString, { status: 400 });
		}

		const pantryController = new PantryController(env, pantryId as keyof Env);

		if (isPantryRequest && method === 'GET') {
			const details = await pantryController.getDetails();
			return new Response(JSON.stringify(details), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}

		if (isPantryRequest && method === 'PUT') {
			const body = await request.json();
			await pantryController.setDetails(body as UpdatePantryDetails);
			return new Response('OK', { status: 200 });
		}

		const basketController = new BasketController(env, pantryId as keyof Env, ttl);

		if (isBasketRequest && method === 'GET') {
			const basketId = parts[5];
			const basket = await basketController.getBasket(basketId);
			if (basket === null) {
				return new Response(`Could not get basket: ${basketId} does not exist`, { status: 400 });
			}
			return new Response(basket, { status: 200, headers: { 'Content-Type': 'application/json' } });
		}

		if (isBasketRequest && method === 'POST') {
			const basketId = parts[5];
			const body = await request.json();
			await basketController.createOrReplaceBasket(basketId, body);
			return new Response('OK', { status: 200 });
		}

		if (isBasketRequest && method === 'PUT') {
			const basketId = parts[5];
			const body = await request.json();
			try {
				await basketController.updateBasket(basketId, body);
			} catch (e) {
				return new Response((e as Error).message, { status: 400 });
			}
			return new Response('OK', { status: 200 });
		}

		if (isBasketRequest && method === 'DELETE') {
			const basketId = parts[5];
			await basketController.deleteBasket(basketId);
			return new Response('OK', { status: 200 });
		}

		return new Response('Method not allowed', { status: 405 });
	},
} satisfies ExportedHandler<Env>;
