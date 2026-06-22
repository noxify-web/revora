import type { Metadata } from "next";
import Script from "next/script";

import { AppNav } from "@/components/app-nav";
import { AppNavMarkup } from "@/components/app-nav-markup";
import { ExtensionBridge } from "@/components/extension-bridge";

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
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.shopify.com/shopifycloud/polaris.js"
          strategy="beforeInteractive"
        />
        <style>{"ui-nav-menu, s-app-nav { display: none; }"}</style>
      </head>
      <body>
        <script src="/revora-app-nav-bootstrap.js" />
        <AppNavMarkup />
        <AppNav />
        <ExtensionBridge />
        {children}
      </body>
    </html>
  );
}
