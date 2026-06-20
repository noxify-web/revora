export {}

declare global {
  interface XMLHttpRequest {
    __revoraUrl?: string
  }
}