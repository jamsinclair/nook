import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

const DETAILS_KEY = '__details__';

const prompt = (question) => {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		readline.question(question, (answer) => {
			readline.close();
			resolve(answer);
		});
	});
};

const getKVNamespaceId = (output) => {
	const regex = /id = "(.*)"/;
	const matches = output.match(regex);

	if (!matches) {
		throw new Error('Error getting KV namespace ID');
	}

	return matches[1];
};

const isWranglerLoggedIn = async () => {
	return new Promise((resolve) => {
		exec('npx wrangler whoami', (err, stdout, stderr) => {
			if (err) {
				resolve(false);
				return;
			}

			const isLoggedIn = stdout.toLowerCase().includes('you are logged in with');
			resolve(isLoggedIn);
		});
	});
};

const doWranglerLogin = async () => {
	return new Promise((resolve) => {
		exec('npx wrangler login', (err, stdout, stderr) => {
			if (err) {
				console.error(`Error logging in: ${err}`);
				resolve(false);
				return;
			}

			const isLoggedIn = stdout.toLowerCase().includes('successfully logged in');
			resolve(isLoggedIn);
		});
	});
};

const isLoggedIn = await isWranglerLoggedIn();
if (!isLoggedIn) {
	console.log('Follow the website prompts to login to your Cloudflare account');
	const success = await doWranglerLogin();
	if (!success) {
		throw new Error('Error logging in to Cloudflare - please try `npx wrangler login` manually');
	}
	console.log('Logged in successfully with Wrangler\n');
}

const pantryId = randomUUID();
const pantryName = (await prompt('Enter the name of your pantry: '))?.trim();
if (!pantryName) {
	throw new Error('Pantry name is required');
}

const createPantry = `npx wrangler kv namespace create ${pantryId}`;

console.log('Creating pantry...');

exec(createPantry, (err, stdout, stderr) => {
	if (err) {
		console.error(`Error creating pantry: ${err}`);
		return;
	}

	const namespaceId = getKVNamespaceId(stdout);
	const addKeyValue = `npx wrangler kv key put --namespace-id=${namespaceId} "${DETAILS_KEY}" '${JSON.stringify({ name: pantryName })}'`;

	exec(addKeyValue, (err, stdout, stderr) => {
		if (err) {
			console.error(`Error adding pantry details: ${err}`);
			return;
		}

		const updateNotice = `Pantry created!

Add the following to your wrangler.toml file in your kv_namespaces array:
[[kv_namespaces]]
binding = "${pantryId}"
id = "${namespaceId}"

After adding the above, run \`npm run cf-typegen\` to generate types for the bindings

Your pantry id is: ${pantryId}

To test your pantry locally, run: \`npm run dev\`

To deploy your pantry, run: \`npm run deploy\``;
		console.log(updateNotice);
	});
});
