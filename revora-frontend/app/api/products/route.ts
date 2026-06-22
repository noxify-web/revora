import { headers } from "next/headers";

import { authenticateExtensionToken } from "@/lib/extension/auth";
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors";
import { getShopify, sessionStorage } from "@/lib/shopify/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTS_QUERY = `#graphql
  query RevoraProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            url
          }
        }
      }
    }
  }
`;

export async function OPTIONS() {
  const headerStore = await headers();
  return extensionOptionsResponse(headerStore.get("origin"));
}

export async function GET(request: Request) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const token = await authenticateExtensionToken(
    headerStore.get("authorization")
  );

  if (!token) {
    return extensionJsonResponse({ error: "Invalid extension token" }, origin, {
      status: 401,
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const shopify = getShopify();
  const offlineId = shopify.session.getOfflineId(token.shop);
  const session = await sessionStorage.loadSession(offlineId);

  if (!session?.accessToken) {
    return extensionJsonResponse(
      {
        error:
          "Shop session not found. Re-open the Revora app in Shopify admin.",
      },
      origin,
      { status: 503 }
    );
  }

  const client = new shopify.clients.Graphql({ session });
  const response = await client.request(PRODUCTS_QUERY, {
    variables: {
      first: 50,
      query: search || undefined,
    },
  });

  const products =
    response.data?.products?.edges?.map(
      (edge: {
        node: {
          id: string;
          title: string;
          handle: string;
          featuredImage?: { url: string } | null;
        };
      }) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        imageUrl: edge.node.featuredImage?.url ?? null,
      })
    ) ?? [];

  return extensionJsonResponse({ products }, origin);
}
