import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  modulesDir: "modules",
  outDir: ".output",
  manifest: {
    name: "Revora — Temu Review Importer",
    version: "0.2.0",
    description:
      "Import Temu product reviews into your Shopify store via Revora.",
    permissions: ["storage", "activeTab", "scripting", "identity"],
    host_permissions: [
      "*://*.temu.com/*",
      "https://admin.shopify.com/*",
      "https://*.trycloudflare.com/*",
      "https://*.ngrok-free.app/*",
      "https://*.ngrok-free.dev/*",
      "https://*.ngrok.io/*",
      "https://*.ngrok.app/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ],
    optional_host_permissions: ["https://*/*"],
    web_accessible_resources: [
      {
        resources: ["fonts/*"],
        matches: ["*://*.temu.com/*"],
      },
    ],
    icons: {
      16: "/icons/icon16.png",
      48: "/icons/icon48.png",
      128: "/icons/icon128.png",
    },
    action: {
      default_title: "Revora",
      default_icon: {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
        128: "/icons/icon128.png",
      },
    },
  },
});
