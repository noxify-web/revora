import { REVORA_DEV_TUNNEL_MATCHES } from "@revora/shared/constants";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  modulesDir: "modules",
  outDir: ".output",
  // Next.js (bun run dev) uses 3000; keep extension HMR on a separate port.
  dev: {
    server: {
      port: 3001,
      strictPort: true,
    },
  },
  manifest: {
    name: "Revora — Temu Review Importer",
    version: "0.2.0",
    description:
      "Import Temu product reviews into your Shopify store via Revora.",
    permissions: ["storage", "activeTab", "scripting", "tabs"],
    host_permissions: [
      "*://*.temu.com/*",
      "https://admin.shopify.com/*",
      ...REVORA_DEV_TUNNEL_MATCHES,
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
