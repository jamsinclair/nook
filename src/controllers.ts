import deepMerge from 'deepmerge';

type PantryDetails = {
	name: string;
	description: string;
	errors: string[];
	notifications: boolean;
	percentFull: number;
	baskets: { name: string; ttl: number }[];
};

export type UpdatePantryDetails = Pick<PantryDetails, 'name' | 'description'>;

const DETAILS_KEY = '__details__';

const unixEpochToTtl = (epoch: number): number => {
	if (epoch === -1) {
		return -1;
	}

	return Math.floor(epoch - Date.now() / 1000);
};

export class PantryController {
	private store: KVNamespace;

	constructor(env: Env, kvNamespace: string) {
		this.store = (env as any)[kvNamespace] as KVNamespace;
	}

	async getDetails(): Promise<PantryDetails> {
		const details = JSON.parse((await this.store.get(DETAILS_KEY)) ?? '{}');
		const keysList = await this.store.list();
		const baskets = keysList.keys
			.map((key) => {
				if (key.name === DETAILS_KEY) {
					return null;
				}

				return { name: key.name, ttl: unixEpochToTtl(key.expiration ?? -1) };
			})
			.filter(Boolean) as { name: string; ttl: number }[];

		return {
			name: details.name,
			description: details.description,
			errors: [],
			notifications: false,
			percentFull: 0,
			baskets,
		};
	}

	async setDetails(value: UpdatePantryDetails): Promise<void> {
		const update = {
			name: value.name,
			description: value.description,
		};
		await this.store.put(DETAILS_KEY, JSON.stringify(update));
	}
}

export class BasketController {
	private store: KVNamespace;
	private ttl?: number;

	constructor(env: Env, kvNamespace: string, ttl?: number) {
		this.store = (env as any)[kvNamespace] as KVNamespace;
		this.ttl = typeof ttl === 'number' && ttl > 0 ? ttl : undefined;
	}

	async createOrReplaceBasket(name: string, value: unknown): Promise<void> {
		await this.store.put(name, JSON.stringify(value), { expirationTtl: this.ttl });
	}

	async getBasket(name: string): Promise<string | null> {
		const value = await this.store.get(name);

		if (typeof value === 'string' && this.ttl) {
			// Refresh the TTL of the basket
			await this.store.put(name, value, { expirationTtl: this.ttl });
		}

		return value;
	}

	async updateBasket(name: string, newData: unknown): Promise<void> {
		const existingString = await this.getBasket(name);
		if (existingString === null) {
			throw new Error(`Could not update basket: ${name} does not exist`);
		}
		const existing = JSON.parse(existingString);

		if (typeof newData === 'object' && newData !== null) {
			const updated = deepMerge(existing, newData as object);
			await this.store.put(name, JSON.stringify(updated), { expirationTtl: this.ttl });
		} else {
			throw new Error('Could not update basket: update data must be an object');
		}
	}

	async deleteBasket(name: string): Promise<void> {
		await this.store.delete(name);
	}
}
