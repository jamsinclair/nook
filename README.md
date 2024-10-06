# Nook

A [pantry](https://github.com/imRohan/Pantry) compatible perishable data storage service hosted with Cloudflare Workers.

This project aims to provide a drop-in replacement for Pantry, with the same API and data format. If you prefer to own your data and have more control over it, Nook is the perfect solution for you.

Great for small sized projects when you need a simple key-value store without the hassle of setting up a database or rely on third-party services.

- 📦 **Pantry Compatible** - Nook is a drop-in replacement for Pantry, with the same API and data format.
- 🔒 **Secure** - Data encrypted at rest with [Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
- 🚀 **Fast** - Hosted on Cloudflare Workers, Nook is fast and reliable
- 💰 **Free** - Can be hosted under the Workers free plan of a Cloudflare account

## Usage

### Pre-requisites

- [A Cloudflare account](https://dash.cloudflare.com/sign-up)

### Setting up Nook

1. Clone or fork this repository
1. `npm install`
1. `npm run init` and follow the prompts to create your pantry (data store)
1. From the init command output
   1. Note down the generated Pantry ID
   1. Copy the kv_namespaces config to the `wrangler.toml` file
1. Run `npm run cf-typegen` to generate the types for the Cloudflare Workers KV bindings
1. `npm run publish` to deploy Nook to Cloudflare Workers

<details>
<summary>Manual Initialisation</summary>

If you prefer to manually set up Nook, you can follow these steps:

1. Create a new namespace in Cloudflare Workers KV and note down the namespace ID.
1. Generate your own Pantry ID. This can be any string you like, but if your worker is public, it is recommended to use a random string to prevent others from accessing your data.
1. Add the following to your `wrangler.toml` file:
   ```toml
   [[kv_namespaces]]
   binding = "<your pantry id>"
   id = "<your KV namespace id>"
   ```
1. Run `npm run cf-typegen` to generate the types for the Cloudflare Workers KV bindings.

</details>

### Using Nook

Once you have deployed Nook, you can use it as a drop-in replacement for Pantry.

If you are using a Pantry client, you can simply replace the Pantry domain or base url with your Cloudflare Workers domain.

```shell
# Create a Basket
curl -X POST https://your-nook-url.nook.workers.dev/apiv1/pantry/your-pantry-id/basket/yourBasket \
  -H "Content-Type: application/json" \
  -d '{"city": "New York"}'

# Get Basket
curl https://your-nook-url.nook.workers.dev/apiv1/pantry/your-pantry-id/basket/yourBasket

# Update Basket
curl -X PUT https://your-nook-url.nook.workers.dev/apiv1/pantry/your-pantry-id/basket/yourBasket \
  -H "Content-Type: application/json" \
  -d '{"state": "NY"}'

# And so on... see Pantry API documentation for more routes
```

### Data Persistence

Nook currently emulates the empheral nature of Pantry. Data is stored in Cloudflare Workers KV with a time-to-live (TTL) of 30 days. This means that data will be automatically deleted after 30 days of inactivity.

If you need data to persist indefinitely, you can modify the `BASKET_TTL_SECONDS` value in the `wrangler.toml` file to a higher or lower value. Setting it to `0` will make data persist indefinitely.

```toml
[vars]
BASKET_TTL_SECONDS = 0 # Set to 0 for indefinite persistence
```

## References

- [Pantry](https://github.com/imRohan/Pantry)
- [Pantry API Documentation](https://documenter.getpostman.com/view/3281832/SzmZeMLC)
- [Cloudflare Workers](https://workers.cloudflare.com/) - Nook is deployed to Cloudflare Workers
- [Cloudflare Workers KV](https://developers.cloudflare.com/kv/) - Nook uses Workers KV to store data

## Acknowledgements

Huge thanks to [imRohan](https://github.com/imRohan) for creating Pantry, which this project builds upon. It is a great project that has helped me quickly hack together prototypes and small projects. I hope Nook can help others in the same way.

## License

Creative Commons Attribution-NonCommercial 4.0 International Public License (CC BY-NC 4.0)

See [LICENSE](LICENSE) for more details.
