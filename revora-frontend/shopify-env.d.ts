/// <reference types="@shopify/polaris-types" />

export {};

declare global {
  interface Window {
    revoraRestartOnboarding?: () => void;
    shopify?: {
      idToken: () => Promise<string>;
      toast?: {
        show: (message: string) => void;
      };
    };
  }
}
