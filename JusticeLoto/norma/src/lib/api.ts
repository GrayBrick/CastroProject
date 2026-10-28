import type { BodyMetrics, ChatMessage, FoodEntry, Product, Recipe, RecipeDraft, Task, UserProfile } from '../types'

export type ClientState = { profile: UserProfile, entries: FoodEntry[], tasks: Task[], favorites: string[], favoriteNutrients: string[], messages: ChatMessage[], productPortions: Record<string, number>, recipes: Recipe[] }

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } })
    if (!response.ok) return null
    return await response.json() as T
  } catch { return null }
}

async function requestOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'Сервер временно недоступен')
  return body as T
}

export async function requestPhoneCode(phone: string) {
  return request<{ ok: boolean, demo?: boolean }>('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ phone }) })
}
export async function verifyPhoneCode(phone: string, code: string) {
  return request<{ ok: boolean, phone: string }>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) })
}
export async function logoutServer() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}
export type ProductPage = { products: Product[], total: number, page: number, pageSize: number, totalPages: number }
export type ProductCategory = { id: string, name: string, count: number }

export async function searchServerProducts(query: string, page = 1, category = '', favoriteIds?: string[]) {
  const params = new URLSearchParams({ q: query, page: String(page) })
  if (category) params.set('category', category)
  if (favoriteIds) params.set('favorites', favoriteIds.join(','))
  return request<ProductPage>(`/api/products?${params}`)
}
export async function listServerProductCategories() {
  return request<{ categories: ProductCategory[] }>('/api/product-categories')
}
export async function lookupBarcode(code: string) {
  return (await requestOrThrow<{ product: Product }>(`/api/products/barcode/${encodeURIComponent(code)}`)).product
}
export async function createPackagedProduct(code: string, nameImage: File, nutritionImage: File) {
  const form = new FormData()
  form.append('nameImage', nameImage); form.append('nutritionImage', nutritionImage)
  return (await requestOrThrow<{ product: Product }>(`/api/products/barcode/${encodeURIComponent(code)}/package`, { method: 'POST', body: form })).product
}
export async function importBodyDocument(document: File) {
  const form = new FormData(); form.append('document', document)
  return requestOrThrow<Partial<BodyMetrics>>('/api/body-composition/import', { method: 'POST', body: form })
}
export async function listServerRecipes() { return request<{ recipes: Recipe[] }>('/api/recipes') }
export async function saveServerRecipe(recipe: RecipeDraft & { id?: string, favorite?: boolean }) {
  return (await requestOrThrow<{ recipe: Recipe }>(recipe.id ? `/api/recipes/${recipe.id}` : '/api/recipes', { method: recipe.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipe) })).recipe
}
export async function deleteServerRecipe(id: string) {
  return requestOrThrow<{ ok: boolean }>(`/api/recipes/${id}`, { method: 'DELETE' })
}
export async function loadServerState() { return request<ClientState>('/api/state') }
export async function saveServerState(state: Omit<ClientState, 'recipes'>) {
  return request<{ ok: boolean }>('/api/state', { method: 'PUT', body: JSON.stringify(state) })
}
