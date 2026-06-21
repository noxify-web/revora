/// <reference types="@shopify/polaris-types" />

export {}

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>
    }
  }
}