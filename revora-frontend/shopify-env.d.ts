/// <reference types="@shopify/polaris-types" />

export {}

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>
      toast?: {
        show: (message: string) => void
      }
    }
    revoraRestartOnboarding?: () => void
    chatwootSettings?: Record<string, unknown>
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot?: {
      setUser: (
        identifier: string,
        user: {
          email?: string
          name?: string
          avatar_url?: string
          phone_number?: string
          company_name?: string
        },
      ) => void
      setCustomAttributes: (attributes: Record<string, string | number>) => void
      reset: () => void
      toggle: (state?: "open" | "close") => void
    }
  }
}