import type { Metadata } from "next";

import { ExtensionBridge } from "@/components/extension-bridge";
import {
  APP_NAV_BOOTSTRAP_SCRIPT,
  APP_NAV_FALLBACK_SCRIPT,
} from "@/lib/shopify/app-nav-html";

export const metadata: Metadata = {
  title: "Revora",
  description: "Import Temu reviews into your Shopify store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta content={apiKey} name="shopify-api-key" />
        <script
          dangerouslySetInnerHTML={{ __html: APP_NAV_BOOTSTRAP_SCRIPT }}
        />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
        <script src="https://cdn.shopify.com/shopifycloud/polaris.js" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: APP_NAV_FALLBACK_SCRIPT }} />
        <ExtensionBridge />
        {children}
      </body>
    </html>
  );
}
