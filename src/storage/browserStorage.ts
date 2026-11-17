import type { StorageAdapter } from './storage'
// Access is lazy: browser SecurityError is caught by the independent storage layer.
export const browserStorage: StorageAdapter = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}
