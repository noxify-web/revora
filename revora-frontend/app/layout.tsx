import { REVORA_LOGO_ASSETS } from "@revora/shared/constants";
import type { Metadata } from "next";
import Script from "next/script";
import { AppNav } from "@/components/app-nav";
import { ExtensionBridge } from "@/components/extension-bridge";
import { EMBEDDED_APP_SHELL_STYLES } from "@/lib/shopify/embedded-app-shell";

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
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: EMBEDDED_APP_SHELL_STYLES }}
        />
      </head>
      <body>
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.shopify.com/shopifycloud/polaris.js"
          strategy="beforeInteractive"
        />
        <AppNav />
        <ExtensionBridge />
        <div aria-busy="true" id="revora-polaris-shell">
          Loading Revora…
        </div>
        <div data-revora-app>{children}</div>
      </body>
    </html>
  );
}
