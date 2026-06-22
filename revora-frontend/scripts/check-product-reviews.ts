import { getShopify, sessionStorage } from "@/lib/shopify/shopify";

const shop = process.argv[2] || "noxify-dvgwvtrt.myshopify.com";
const handle = process.argv[3] || "selling-plans-ski-wax";

const shopify = getShopify();
const session = await sessionStorage.loadSession(
  shopify.session.getOfflineId(shop)
);

if (!session?.accessToken) {
  console.error("No app session");
  process.exit(1);
}

const client = new shopify.clients.Graphql({ session });
const response = await client.request(
  `#graphql
  query CheckRevoraProduct($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      revoraCount: metafield(namespace: "$app", key: "revora_review_count") { value }
      revoraAvg: metafield(namespace: "$app", key: "revora_average_rating") { value }
      revoraReviews: metafield(namespace: "$app", key: "revora_reviews") {
        type
        value
        references(first: 3) {
          edges {
            node {
              ... on Metaobject {
                id
                handle
                fields { key value }
              }
            }
          }
        }
      }
    }
    metaobjects(type: "$app:revora_review", first: 3) {
      edges { node { id handle } }
    }
    metaobjectDefinitionByType(type: "$app:revora_review") {
      id
      name
    }
  }
`,
  { variables: { handle } }
);

console.log(JSON.stringify(response.data, null, 2));
