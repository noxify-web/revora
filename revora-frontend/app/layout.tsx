import { REVORA_LOGO_ASSETS } from "@revora/shared/constants";
import type { Metadata } from "next";
import Script from "next/script";
import { ExtensionBridge } from "@/components/extension-bridge";
import {
  APP_NAV_BOOTSTRAP_SCRIPT,
  APP_NAV_FALLBACK_SCRIPT,
} from "@/lib/shopify/app-nav-html";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Revora",
    description: "Import Temu reviews into your Shopify store",
    icons: {
      icon: [
        { url: REVORA_LOGO_ASSETS.ico, sizes: "32x32" },
        { url: REVORA_LOGO_ASSETS.svg, type: "image/svg+xml" },
      ],
      apple: REVORA_LOGO_ASSETS.png,
      shortcut: REVORA_LOGO_ASSETS.ico,
    },
    other: {
      "shopify-api-key": process.env.SHOPIFY_API_KEY || "",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          dangerouslySetInnerHTML={{ __html: APP_NAV_BOOTSTRAP_SCRIPT }}
          id="revora-app-nav-bootstrap"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.shopify.com/shopifycloud/polaris.js"
          strategy="beforeInteractive"
        />
        <Script
          dangerouslySetInnerHTML={{ __html: APP_NAV_FALLBACK_SCRIPT }}
          id="revora-app-nav-fallback"
          strategy="afterInteractive"
        />
        <ExtensionBridge />
        {children}
      </body>
    </html>
  );
}
