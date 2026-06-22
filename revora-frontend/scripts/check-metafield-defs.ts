import { getShopify, sessionStorage } from "@/lib/shopify/shopify";

const shop = process.argv[2] || "noxify-dvgwvtrt.myshopify.com";
const shopify = getShopify();
const session = await sessionStorage.loadSession(
  shopify.session.getOfflineId(shop)
);

if (!session?.accessToken) {
  console.error("No app session");
  process.exit(1);
}

const client = new shopify.clients.Graphql({ session });
const response = await client.request(`#graphql
  query CheckDefs {
    metafieldDefinitions(first: 20, ownerType: PRODUCT, namespace: "$app") {
      edges {
        node {
          namespace
          key
          name
          type { name }
          access { storefront }
        }
      }
    }
    metaobjectDefinitionByType(type: "$app:revora_review") {
      id
      name
      access { storefront }
    }
  }
`);

console.log(JSON.stringify(response.data, null, 2));
