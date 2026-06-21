import type { Metadata } from "next"
import Script from "next/script"

import { ExtensionBridge } from "@/components/extension-bridge"

export const metadata: Metadata = {
  title: "Revora",
  description: "Import Temu reviews into your Shopify store",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const apiKey = process.env.SHOPIFY_API_KEY || ""

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="shopify-api-key" content={apiKey} />
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.shopify.com/shopifycloud/polaris.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <ExtensionBridge />
        {children}
      </body>
    </html>
  )
}
