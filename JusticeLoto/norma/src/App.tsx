import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpDown, Barcode, Bell, BookOpen, CalendarDays, Camera, Check,
  CheckCircle2, ChevronRight, Circle, Dumbbell, Filter, Flame, Heart, Home, Images,
  Leaf, LoaderCircle, LogOut, MessageCircle, MoreHorizontal, Pencil, Plus,
  Search, Send, Settings2, Sparkles, Trash2, UserRound, Utensils, X,
} from 'lucide-react'
import BarcodeScanner from './components/BarcodeScanner'
import NumericInput from './components/NumericInput'
import MarkdownMessage from './components/MarkdownMessage'
import ChatFoodCard from './components/ChatFoodCard'
import ChatRecipeCard from './components/ChatRecipeCard'
import RecipeEditor from './components/RecipeEditor'
import PackagedProductForm from './components/PackagedProductForm'
import BodyImportButton from './components/BodyImportButton'
import { CalorieRing, MacroRings, NutrientProfileList } from './components/Nutrition'
import { analyzeFoodPhoto, askCoach, type PhotoItem } from './lib/kimi'
import { deleteServerRecipe, importBodyDocument, listServerProductCategories, loadServerState, logoutServer, requestPhoneCode, saveServerRecipe, saveServerState, searchServerProducts, verifyPhoneCode, type ProductCategory } from './lib/api'
import { formatValue, initialEntries, initialTasks, products as localProducts, sumEntries, todayISO } from './data'
import { calculateBmr, calculateGoals, defaultProfile, formatNutrient, nutrientBenefit, nutrientDefinitions, nutrientMap, nutrientShortName, topNutrients } from './nutrients'
import { recipeToProduct, scaledRecipeIngredients } from './recipes'
import type { ChatMessage, FoodEntry, Meal, Product, Recipe, RecipeDraft, Task, UserProfile } from './types'
import './App.css'

type Tab = 'today' | 'food' | 'plan' | 'coach'
type Sheet = 'photo' | 'barcode' | 'task' | 'profile' | 'nutrients' | 'recipe' | 'package' | null

const meals: Meal[] = ['Завтрак', 'Обед', 'Ужин', 'Перекус']
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

function paginationItems(current: number, total: number) {
  const pages = [...new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))].sort((a, b) => a - b)
  const items: Array<number | string> = []
  pages.forEach((page, index) => {
    if (index && page - pages[index - 1] > 1) items.push(`gap-${pages[index - 1]}`)
    items.push(page)
  })
  return items
}

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback } catch { return fallback }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue] as const
}

function formatPhone(input: string) {
  let digits = input.replace(/\D/g, '')
  if (!digits) return ''
  if (digits[0] === '8' || digits[0] === '7') digits = digits.slice(1)
  digits = digits.slice(0, 10)
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
  let result = `+7${groups[0] ? ` ${groups[0]}` : ''}`
  if (groups[1]) result += ` ${groups[1]}`
  if (groups[2]) result += `-${groups[2]}`
  if (groups[3]) result += `-${groups[3]}`
  return result
}

function SheetModal({ title, subtitle, onClose, children }: { title: string, subtitle?: string, onClose: () => void, children: ReactNode }) {
  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet" role="dialog" aria-modal="true" aria-label={title}><div className="sheet-handle" />
      <div className="sheet-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></div>
      {children}</section>
  </div>
}

function Auth({ onAuth }: { onAuth: (phone: string) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverMode, setServerMode] = useState(false)
  const codeInput = useRef<HTMLInputElement>(null)

  const submitPhone = async (event: FormEvent) => {
    event.preventDefault()
    if (phone.replace(/\D/g, '').length !== 11) return setError('Введите номер из 11 цифр')
    setLoading(true); setError('')
    const result = await requestPhoneCode(phone)
    setServerMode(!!result); setLoading(false); setStep('code')
  }
  const verify = async (value: string) => {
    if (loading) return
    setLoading(true); setError('')
    if (serverMode) {
      const result = await verifyPhoneCode(phone, value)
      if (result?.ok) return onAuth(phone)
      setError('Неверный или истёкший код'); setCode(''); setLoading(false)
    } else {
      if (value === '2410') return onAuth(phone)
      setError('Для локального демо введите 2410'); setCode(''); setLoading(false)
    }
  }
  const changeCode = (value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 4)
    setCode(normalized)
    if (normalized.length === 4) { codeInput.current?.blur(); void verify(normalized) }
  }

  return <main className="auth-screen"><div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    <div className="auth-top"><div className="brand-mark"><Leaf size={22} /></div><span>норма</span></div>
    <div className="auth-copy"><span className="eyebrow">ПИТАНИЕ · РИТМ · ЭНЕРГИЯ</span><h1>Забота о себе,<br />без лишнего.</h1>
      <p>Еда, нутриенты и планы в одном спокойном месте. Персональные рекомендации помогут выстроить ваш ритм.</p></div>
    <form className="auth-card" onSubmit={submitPhone}>
      {step === 'code' && <button type="button" className="back-link" onClick={() => { setStep('phone'); setCode(''); setError('') }}><ArrowLeft size={16} /> Изменить номер</button>}
      <h2>{step === 'phone' ? 'Войти по телефону' : 'Введите код'}</h2>
      <p>{step === 'phone' ? 'Начнём с вашего личного дневника' : serverMode ? `Код отправлен на ${phone}` : `Локальный демо-код для ${phone}: 2410`}</p>
      {step === 'phone' ? <label className="field-label">Номер телефона<input className="text-input phone-input" value={phone}
        onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="+7 917 513-33-15" inputMode="tel" autoComplete="tel" autoFocus /></label>
        : <><input ref={codeInput} className="text-input code-input" value={code} onChange={(event) => changeCode(event.target.value)}
          placeholder="••••" inputMode="numeric" autoComplete="one-time-code" autoFocus disabled={loading} />
          <div className="auto-code-note">{loading ? <><LoaderCircle className="spin" size={15} /> Проверяем код…</> : 'Вход произойдёт автоматически после 4 цифр'}</div></>}
      {error && <div className="form-error">{error}</div>}
      {step === 'phone' && <button className="primary-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{serverMode ? 'Получить код' : 'Продолжить'}</button>}
      <small>{serverMode ? 'Код действует 5 минут. Никому не сообщайте его.' : 'Без сервера SMS не отправляется; демо-данные остаются на устройстве.'}</small>
    </form>
  </main>
}

function MacroBar({ label, value = 0, goal, color }: { label: string, value?: number, goal: number, color: string }) {
  return <div className="macro-item"><div><span>{label}</span><strong>{Math.round(value)} <small>/ {goal} г</small></strong></div>
    <div className="thin-track"><i style={{ width: `${Math.min(100, value / goal * 100)}%`, background: color }} /></div></div>
}

function EmptyDay({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Utensils size={25} /></div><h3>День ещё не начался</h3>
    <p>Добавьте первый продукт или сфотографируйте блюдо.</p><button className="secondary-button" onClick={onAdd}><Plus size={17} /> Добавить еду</button></div>
}

export default function App() {
  const [phone, setPhone] = useStored<string | null>('norma-phone', null)
  const [profile, setProfile] = useStored<UserProfile>('norma-profile-v1', defaultProfile)
  const [tab, setTab] = useState<Tab>('today')
  const [entries, setEntries] = useStored<FoodEntry[]>('norma-entries-v1', initialEntries)
  const [tasks, setTasks] = useStored<Task[]>('norma-tasks-v2', initialTasks)
  const [favorites, setFavorites] = useStored<string[]>('norma-favorites-v1', ['yogurt', 'chicken', 'banana'])
  const [favoriteNutrients, setFavoriteNutrients] = useStored<string[]>('norma-favorite-nutrients-v1', [])
  const [messages, setMessages] = useStored<ChatMessage[]>('norma-chat-v1', [])
  const [productPortions, setProductPortions] = useStored<Record<string, number>>('norma-product-portions-v1', {})
  const [categories, setCategories] = useStored<string[]>('norma-categories-v1', ['Тренировка', 'Здоровье', 'Личное'])
  const [recipes, setRecipes] = useStored<Recipe[]>('norma-recipes-v1', [])
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([])
  const recipeProducts = useMemo(() => recipes.map(recipeToProduct), [recipes])
  const products = useMemo(() => [...recipeProducts, ...remoteProducts, ...localProducts.filter((local) => !remoteProducts.some((remote) => remote.id === local.id))], [recipeProducts, remoteProducts])
  const goals = useMemo(() => calculateGoals(profile), [profile])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [packageBarcode, setPackageBarcode] = useState('')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [productDetails, setProductDetails] = useState(false)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState<Meal>('Обед')
  const [quickOpen, setQuickOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [flamePulse, setFlamePulse] = useState(0)
  const [nutrientFocus, setNutrientFocus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [foodFilter, setFoodFilter] = useState<'all' | 'favorites'>('all')
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogCategory, setCatalogCategory] = useState('')
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [catalogInfo, setCatalogInfo] = useState({ total: 0, totalPages: 1 })
  const [catalogAvailable, setCatalogAvailable] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'today' | 'all' | 'inbox'>('today')
  const [taskStatus, setTaskStatus] = useState<'all' | 'active' | 'done'>('all')
  const [taskCategory, setTaskCategory] = useState('all')
  const [taskSort, setTaskSort] = useState<'date' | 'created' | 'title'>('date')
  const [toast, setToast] = useState('')
  const [cameraHintOpen, setCameraHintOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [photo, setPhoto] = useState<{ url: string, file: File } | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoResult, setPhotoResult] = useState<Awaited<ReturnType<typeof analyzeFoodPhoto>> | null>(null)
  const [serverReady, setServerReady] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)
  const quickActions = useRef<HTMLDivElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const dayEntries = useMemo(() => entries.filter((entry) => entry.date === selectedDate), [entries, selectedDate])
  const totals = useMemo(() => sumEntries(dayEntries), [dayEntries])
  const todayEntries = useMemo(() => entries.filter((entry) => entry.date === todayISO()), [entries])
  const todayTotals = useMemo(() => sumEntries(todayEntries), [todayEntries])
  const dateLabel = selectedDate === todayISO() ? 'Сегодня' : new Date(`${selectedDate}T12:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  useEffect(() => {
    if (!phone) return
    let active = true
    loadServerState().then((state) => {
      if (!active) return
      if (state) {
        if (state.profile) setProfile(state.profile)
        setEntries(state.entries); setTasks(state.tasks); setFavorites(state.favorites); setFavoriteNutrients(state.favoriteNutrients ?? []); setMessages(state.messages); setProductPortions(state.productPortions ?? {}); setRecipes(state.recipes ?? [])
        setServerReady(true)
      }
    })
    return () => { active = false }
  }, [phone, setEntries, setFavorites, setFavoriteNutrients, setMessages, setProductPortions, setProfile, setRecipes, setTasks])
  useEffect(() => {
    if (!serverReady) return
    const timer = setTimeout(() => { void saveServerState({ profile, entries, tasks, favorites, favoriteNutrients, messages, productPortions }) }, 1400)
    return () => clearTimeout(timer)
  }, [serverReady, profile, entries, tasks, favorites, favoriteNutrients, messages, productPortions])
  useEffect(() => {
    if (tab !== 'food' || productCategories.length) return
    let active = true
    void listServerProductCategories().then((result) => { if (active && result) setProductCategories(result.categories) })
    return () => { active = false }
  }, [tab, productCategories.length])
  useEffect(() => {
    if (tab !== 'food') return
    let active = true
    const timer = setTimeout(() => {
      setCatalogLoading(true)
      void searchServerProducts(search.trim(), catalogPage, catalogCategory, foodFilter === 'favorites' ? favorites : undefined).then((result) => {
        if (!active) return
        if (result) {
          setRemoteProducts(result.products)
          setCatalogInfo({ total: result.total, totalPages: result.totalPages })
          setCatalogAvailable(true)
        } else setCatalogAvailable(false)
        setCatalogLoading(false)
      })
    }, search.trim() ? 450 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [search, tab, catalogPage, catalogCategory, foodFilter, favorites])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2400); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, chatLoading])
  useEffect(() => {
    if (sheet !== 'nutrients' || !nutrientFocus) return
    const timer = setTimeout(() => document.querySelector(`[data-nutrient="${nutrientFocus}"]`)?.scrollIntoView({ block: 'center' }), 120)
    return () => clearTimeout(timer)
  }, [sheet, nutrientFocus])
  useEffect(() => {
    if (!quickOpen) return
    const close = () => { setQuickOpen(false); setCameraOpen(false) }
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !quickActions.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('scroll', close, true)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('scroll', close, true) }
  }, [quickOpen])

  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 3 + index)
    return { iso: date.toLocaleDateString('en-CA'), day: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''), num: date.getDate() }
  }), [])

  const closeProduct = () => { setSelectedProduct(null); setEditingEntryId(null); setProductDetails(false) }
  const openProduct = (product: Product, entry?: FoodEntry) => {
    setSelectedProduct(product); setEditingEntryId(entry?.id ?? null); setProductDetails(false)
    setGrams(entry?.grams ?? productPortions[product.id] ?? product.servingGrams ?? (product.id === 'eggs' ? 120 : 100)); setMeal(entry?.meal ?? 'Обед')
  }
  const openCatalog = () => {
    setSearch(''); setCatalogPage(1); setCatalogCategory(''); setFoodFilter('all'); setQuickOpen(false); setCameraOpen(false); setTab('food')
  }
  const openPhotoPicker = (source: 'camera' | 'gallery') => {
    setQuickOpen(false); setCameraOpen(false); setSheet('photo')
    const input = source === 'camera' ? cameraInput.current : galleryInput.current
    if (input) { input.value = ''; input.click() }
  }
  const requestCamera = () => {
    const openings = Number.parseInt(localStorage.getItem('norma-camera-openings') ?? '0', 10) || 0
    if (openings >= 5) return openPhotoPicker('camera')
    setQuickOpen(false); setCameraOpen(false); setCameraHintOpen(true)
  }
  const confirmCameraOpen = () => {
    const openings = Number.parseInt(localStorage.getItem('norma-camera-openings') ?? '0', 10) || 0
    localStorage.setItem('norma-camera-openings', String(Math.min(5, openings + 1)))
    setCameraHintOpen(false)
    openPhotoPicker('camera')
  }
  const rememberPortion = (productId: string, amount: number) => setProductPortions((current) => ({ ...current, [productId]: amount }))
  const addFood = (product: Product, amount = grams, selectedMeal = meal) => {
    if (amount <= 0) return
    rememberPortion(product.id, amount)
    if (editingEntryId) {
      setEntries((current) => current.map((item) => item.id === editingEntryId ? { ...item, productId: product.id, productSnapshot: product, grams: amount, meal: selectedMeal } : item))
      setToast(`${product.name} · порция обновлена`)
    } else {
      const entry: FoodEntry = { id: uid(), productId: product.id, productSnapshot: product, grams: amount, meal: selectedMeal,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), date: selectedDate }
      setEntries((current) => [...current, entry]); setToast(`${product.name} · ${amount} г добавлено`)
    }
    closeProduct(); setSheet(null); setPhotoResult(null); setPhoto(null)
  }
  const persistRecipe = async (draft: RecipeDraft & { id?: string, favorite?: boolean }) => {
    const saved = await saveServerRecipe(draft)
    setRecipes((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
    return saved
  }
  const toggleFavorite = (id: string) => {
    const recipe = recipes.find((item) => `recipe-${item.id}` === id)
    if (recipe) { void persistRecipe({ ...recipe, favorite: !recipe.favorite }).catch(() => setToast('Не удалось изменить избранное')); return }
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const removeRecipe = async (id: string) => {
    await deleteServerRecipe(id)
    setRecipes((current) => current.filter((item) => item.id !== id)); setSheet(null); setEditingRecipe(null); setToast('Рецепт удалён')
  }
  const openRecipeEditor = (recipe?: Recipe) => { setEditingRecipe(recipe ?? null); setSheet('recipe') }
  const toggleFavoriteNutrient = (key: string) => setFavoriteNutrients((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  const openNutrients = (key?: string) => { setNutrientFocus(key ?? null); setSheet('nutrients') }
  const sendChat = async (preset?: string, previousMessages?: ChatMessage[]) => {
    const text = (preset ?? chatInput).trim()
    if (chatLoading || (!previousMessages && !text) || (previousMessages && !previousMessages.length)) return
    const next = previousMessages ?? [...messages, { id: uid(), role: 'user' as const, text }]
    if (!previousMessages) { setMessages(next); setChatInput('') }
    setChatError(''); setChatLoading(true)
    try {
      const answer = await askCoach(next, { date: todayISO(), totals: todayTotals, goals, entries: todayEntries, tasks: tasks.filter((task) => task.date === todayISO()), profile })
      setMessages((current) => [...current, { id: uid(), role: 'assistant', text: answer.text, food: answer.food, foods: answer.foods, recipes: answer.recipes }])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Не удалось получить ответ. Попробуйте ещё раз.')
    } finally {
      setChatLoading(false)
    }
  }
  const addChatFood = (product: Product, grams: number) => {
    const entry: FoodEntry = { id: uid(), productId: product.id, productSnapshot: product, grams, meal,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), date: todayISO() }
    setRemoteProducts((current) => [product, ...current.filter((item) => item.id !== product.id)])
    setEntries((current) => [...current, entry])
    rememberPortion(product.id, grams)
    setToast(`${product.name} · ${grams} г добавлено`)
  }
  const applyBodyMetrics = (metrics: Partial<UserProfile>) => {
    setProfile((current) => ({ ...current, ...metrics }))
    if (photo?.url) URL.revokeObjectURL(photo.url)
    setPhoto(null); setPhotoResult(null); setPhotoError(''); setSheet('profile'); setToast('Показатели тела добавлены в профиль')
  }
  const handlePhoto = async (file?: File) => {
    if (!file || photoLoading) return
    if (photo?.url) URL.revokeObjectURL(photo.url)
    setPhoto({ url: URL.createObjectURL(file), file }); setPhotoResult(null); setPhotoError(''); setPhotoLoading(true)
    try {
      if (file.type === 'application/pdf') return applyBodyMetrics(await importBodyDocument(file))
      const result = await analyzeFoodPhoto(file)
      if (result.kind === 'body' && result.bodyMetrics) return applyBodyMetrics(result.bodyMetrics)
      const recognized = result.items.map((item) => item.product)
      setRemoteProducts((current) => [...recognized, ...current.filter((product) => !recognized.some((item) => item.id === product.id))])
      setPhotoResult(result)
    } catch (error) {
      setPhotoResult(null)
      setPhotoError(error instanceof Error ? error.message : 'Не удалось распознать фото. Попробуйте ещё раз.')
    } finally {
      setPhotoLoading(false)
    }
  }
  const closePhoto = () => {
    if (photo?.url) URL.revokeObjectURL(photo.url)
    setSheet(null); setPhoto(null); setPhotoResult(null); setPhotoError('')
  }
  const updatePhotoGrams = (index: number, value: number) => {
    setPhotoResult((current) => current ? { ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, estimatedGrams: value } : item) } : current)
  }
  const photoEntry = (item: PhotoItem): FoodEntry => ({
    id: uid(), productId: item.product.id, productSnapshot: item.product, grams: item.estimatedGrams, meal,
    time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), date: selectedDate,
  })
  const addPhotoItem = (item: PhotoItem, index: number) => {
    if (item.estimatedGrams <= 0) return
    setEntries((current) => [...current, photoEntry(item)])
    rememberPortion(item.product.id, item.estimatedGrams)
    setPhotoResult((current) => current ? { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) } : current)
    setToast(`${item.product.name} · ${item.estimatedGrams} г добавлено`)
  }
  const addAllPhotoItems = () => {
    if (!photoResult?.items.length || photoResult.items.some((item) => item.estimatedGrams <= 0)) return
    setEntries((current) => [...current, ...photoResult.items.map(photoEntry)])
    setProductPortions((current) => ({ ...current, ...Object.fromEntries(photoResult.items.map((item) => [item.product.id, item.estimatedGrams])) }))
    setToast(`Добавлено продуктов: ${photoResult.items.length}`)
    closePhoto()
  }

  if (!phone) return <Auth onAuth={setPhone} />

  const allCategories = [...new Set([...categories, ...tasks.map((task) => task.category)])]
  const serverCatalog = catalogAvailable
  const selectedCategoryName = productCategories.find((item) => item.id === catalogCategory)?.name
  const isFavorite = (id: string) => favorites.includes(id) || recipes.some((recipe) => recipe.favorite && `recipe-${recipe.id}` === id)
  const matchingRecipes = recipeProducts.filter((product) => {
    const matches = `${product.name} ${product.note}`.toLowerCase().includes(search.toLowerCase().trim())
    return matches && !catalogCategory && (foodFilter === 'all' || isFavorite(product.id))
  })
  const filteredProducts = serverCatalog ? [...matchingRecipes, ...remoteProducts] : products.filter((product) => {
    const matches = `${product.name} ${product.category} ${product.note}`.toLowerCase().includes(search.toLowerCase().trim())
    const matchesCategory = !selectedCategoryName || product.category === selectedCategoryName
    return matches && matchesCategory && (foodFilter === 'all' || isFavorite(product.id))
  })
  const catalogTotal = serverCatalog ? catalogInfo.total + matchingRecipes.length : filteredProducts.length
  const changeCatalogPage = (page: number) => {
    setCatalogPage(page)
    window.setTimeout(() => document.querySelector('.catalog-meta')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const visibleTasks = tasks.filter((task) => {
    const period = taskFilter === 'all' || (taskFilter === 'inbox' ? !task.date : task.date === todayISO())
    return period && (taskStatus === 'all' || (taskStatus === 'done' ? task.done : !task.done)) && (taskCategory === 'all' || task.category === taskCategory)
  }).sort((a, b) => taskSort === 'title' ? a.title.localeCompare(b.title, 'ru') : taskSort === 'created' ? b.createdAt.localeCompare(a.createdAt) :
    `${a.date ?? '9999'}T${a.startTime ?? '23:59'}`.localeCompare(`${b.date ?? '9999'}T${b.startTime ?? '23:59'}`))
  const selectedRecipe = selectedProduct?.recipeId ? recipes.find((recipe) => recipe.id === selectedProduct.recipeId) : undefined

  return <div className="app-shell"><div className="app-frame">
    <header className="app-header"><button className="profile-button" onClick={() => setSheet('profile')} aria-label="Личный профиль"><span>С</span><i /></button>
      <div className="header-brand"><Leaf size={16} /> норма</div><button className="icon-button notification-button" aria-label="Уведомления" onClick={() => setToast('Напоминания появятся в следующей версии')}><Bell size={20} /><i /></button></header>
    <main className={`app-content ${tab === 'coach' ? 'coach-content' : ''}`}>
      {tab === 'today' && <>
        <section className="welcome-row"><div><span className="muted-label">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>Твой баланс</h1></div></section>
        <div className="week-strip">{week.map((day) => {
          const dayTotals = sumEntries(entries.filter((entry) => entry.date === day.iso))
          return <button key={day.iso} className={selectedDate === day.iso ? 'selected' : ''} onClick={() => setSelectedDate(day.iso)} aria-label={`${day.day}, ${day.num}`}>
            <span className="weekday">{day.day}</span><MacroRings totals={dayTotals} goals={goals}><strong className="day-number">{day.num}</strong></MacroRings>
          </button>
        })}</div>
        <section className={`balance-card ${quickOpen ? 'actions-open' : ''}`}><div className="balance-core"><div className="balance-main"><CalorieRing totals={totals} goals={goals} flamePulse={flamePulse} />
          <div className="remaining-copy"><span>Осталось на сегодня</span><strong>{Math.max(0, Math.round(goals.calories - (totals.calories ?? 0)))} <small>ккал</small></strong>{(totals.calories ?? 0) > goals.calories && <p>Норма калорий выполнена</p>}</div></div>
          <div className="macro-grid"><MacroBar label="Белки" value={totals.protein} goal={goals.protein} color="#617b4a" /><MacroBar label="Жиры" value={totals.fat} goal={goals.fat} color="#d49a59" /><MacroBar label="Углеводы" value={totals.carbs} goal={goals.carbs} color="#a27860" /></div></div>
          <div ref={quickActions} className={`quick-fab ${quickOpen ? 'open' : ''} ${cameraOpen ? 'camera-open' : ''}`}>
            <button className="fab-secondary fab-gallery" onClick={() => openPhotoPicker('gallery')} aria-label="Выбрать из галереи" tabIndex={quickOpen && cameraOpen ? 0 : -1}><Images size={22} /><span>Галерея</span></button>
            <button className="fab-secondary fab-photo" onClick={() => cameraOpen ? requestCamera() : setCameraOpen(true)} aria-label="Камера" aria-expanded={cameraOpen} tabIndex={quickOpen ? 0 : -1}><Camera size={22} /><span>Камера</span></button>
            <button className="fab-secondary fab-barcode" onClick={() => { setQuickOpen(false); setCameraOpen(false); setSheet('barcode') }} aria-label="Сканировать штрихкод" tabIndex={quickOpen ? 0 : -1}><Barcode size={22} /><span>Штрихкод</span></button>
            <button className="fab-main" onClick={() => quickOpen ? openCatalog() : (setQuickOpen(true), setFlamePulse((current) => current + 1))} aria-label={quickOpen ? 'Открыть каталог' : 'Быстро добавить еду'} aria-expanded={quickOpen}><Plus size={27} /></button>
            <input ref={galleryInput} className="photo-file-input" type="file" accept="image/*,.pdf,application/pdf" aria-label="Фото еды или отчёт InBody из галереи" onChange={(event) => handlePhoto(event.target.files?.[0])} />
            <input ref={cameraInput} className="photo-file-input" type="file" accept="image/*" capture="environment" aria-label="Снимок с камеры" onChange={(event) => handlePhoto(event.target.files?.[0])} />
          </div></section>
        <section className="section-block"><div className="section-title"><h2>{dateLabel}: приёмы пищи</h2><span>{dayEntries.length} записей</span></div>
          {dayEntries.length === 0 ? <EmptyDay onAdd={openCatalog} /> : <div className="meal-list">{meals.map((mealName) => {
            const mealEntries = dayEntries.filter((entry) => entry.meal === mealName); if (!mealEntries.length) return null
            return <div className="meal-group" key={mealName}><div className="meal-heading"><strong>{mealName}</strong><span>{Math.round(sumEntries(mealEntries).calories ?? 0)} ккал</span></div>
              {mealEntries.map((entry) => { const product = entry.productSnapshot ?? products.find((item) => item.id === entry.productId); if (!product) return null
                return <div className="entry-row" key={entry.id}><button className="entry-main" onClick={() => openProduct(product, entry)} aria-label={`Изменить ${product.name}`}><div className="food-emoji">{product.emoji}</div><div><strong>{product.name}</strong><span>{entry.grams} г · {entry.time}</span></div><b>{Math.round(product.nutrients.calories * entry.grams / 100)}</b></button><button className="delete-entry" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} aria-label={`Удалить ${product.name}`}><Trash2 size={15} /></button></div> })}</div>
          })}</div>}</section>
        <section className="section-block micronutrients"><div className="section-title"><h2>Витамины и минералы</h2><button onClick={() => openNutrients()}>Выбрать</button></div>
          {favoriteNutrients.length === 0 ? <button className="empty-nutrients" onClick={() => openNutrients()}><Plus size={20} /><span><strong>Добавьте важные нутриенты</strong><small>Они появятся здесь и будут учитывать вашу норму</small></span><ChevronRight size={18} /></button>
            : <div className={`micro-grid ${favoriteNutrients.length === 1 ? 'single' : ''}`}>{favoriteNutrients.map((key) => nutrientMap.get(key)).filter((definition) => definition !== undefined).map((definition) => {
              const goal = goals[definition.key] ?? 0
              const percent = goal > 0 ? (totals[definition.key] ?? 0) / goal * 100 : null
              return <button className="micro-card" onClick={() => openNutrients(definition.key)} key={definition.key}>
                <div className={`micro-symbol ${definition.key}`}>{nutrientShortName(definition.key)}</div><div><strong>{definition.name}</strong><span>{nutrientBenefit(definition.key)}</span></div><b>{percent === null ? '—' : `${Math.round(percent)}%`}</b>
                <div className="thin-track"><i style={{ width: `${Math.min(100, percent ?? 0)}%` }} /></div><small>{formatValue(definition.key, totals[definition.key] ?? 0)}{goal > 0 ? ` из ${formatValue(definition.key, goal)}` : ' · норма не задана'}</small></button>
            })}</div>}</section>
      </>}

      {tab === 'food' && <>
        <section className="page-heading"><div><span className="muted-label">КАТАЛОГ ПРОДУКТОВ</span><h1>Что добавим?</h1></div><button className="round-add" onClick={() => openRecipeEditor()} aria-label="Создать рецепт"><BookOpen size={21} /></button></section>
        <button className="recipe-create-button" onClick={() => openRecipeEditor()}><BookOpen size={18} /><span><strong>Мои рецепты</strong><small>Создайте блюдо из продуктов каталога</small></span><Plus size={18} /></button>
        <div className="search-box"><Search size={20} /><input value={search} onChange={(event) => { setSearch(event.target.value); setCatalogPage(1) }} placeholder="Гречка, творог, банан…" autoFocus />{search && <button onClick={() => { setSearch(''); setCatalogPage(1) }} aria-label="Очистить"><X size={17} /></button>}</div>
        <div className="segmented"><button className={foodFilter === 'all' ? 'active' : ''} onClick={() => setFoodFilter('all')}>Все продукты</button><button className={foodFilter === 'favorites' ? 'active' : ''} onClick={() => setFoodFilter('favorites')}><Heart size={15} /> Избранное <span>{favorites.length + recipes.filter((recipe) => recipe.favorite).length}</span></button></div>
        <label className="category-picker"><Filter size={16} /><select aria-label="Категория продуктов" value={catalogCategory} onChange={(event) => { setCatalogCategory(event.target.value); setCatalogPage(1) }}><option value="">Все категории</option>{productCategories.map((category) => <option value={category.id} key={category.id}>{category.name} · {category.count}</option>)}</select></label>
        <div className="catalog-meta"><span>{search ? `По запросу «${search}»` : selectedCategoryName ?? 'Продукты на русском'}</span><small>{catalogLoading ? 'Загружаем…' : `${catalogTotal} результатов`}</small></div>
        <div className={`product-list ${catalogLoading ? 'loading' : ''}`}>{filteredProducts.map((product) => <article className="product-row" key={product.id}>
          <button className="product-main" onClick={() => openProduct(product)}><div className="food-emoji large">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.emoji}</div><div><h3>{product.name}</h3><span>{product.category} · {product.note}</span>
            <p><b>{Math.round(product.nutrients.calories ?? 0)}</b> ккал <i>·</i> Б {Math.round(product.nutrients.protein ?? 0)} <i>·</i> Ж {Math.round(product.nutrients.fat ?? 0)} <i>·</i> У {Math.round(product.nutrients.carbs ?? 0)}</p>
            <div className="product-highlights">{topNutrients(product.nutrients, goals).map(({ definition, value, percent }) => <span key={definition.key}>{definition.name.replace('Витамин ', 'Вит. ')} <b>{Math.round(percent)}%</b> · {formatNutrient(definition.key, value, true)}</span>)}</div></div></button>
          <div className="product-actions">{product.recipeId && <button className="favorite" onClick={() => openRecipeEditor(recipes.find((recipe) => recipe.id === product.recipeId))} aria-label="Редактировать рецепт"><Pencil size={17} /></button>}<button className={isFavorite(product.id) ? 'favorite active' : 'favorite'} onClick={() => toggleFavorite(product.id)} aria-label="Избранное"><Heart size={18} fill={isFavorite(product.id) ? 'currentColor' : 'none'} /></button><button className="small-add" onClick={() => openProduct(product)}><Plus size={18} /></button></div></article>)}
          {!filteredProducts.length && !catalogLoading && <div className="empty-state"><Search size={28} /><h3>Ничего не нашли</h3><p>Попробуйте другое название, категорию или добавьте блюдо по фото.</p></div>}</div>
        {serverCatalog && catalogInfo.totalPages > 1 && <nav className="catalog-pagination" aria-label="Страницы продуктов">
          <button className="page-arrow" disabled={catalogPage === 1} onClick={() => changeCatalogPage(catalogPage - 1)} aria-label="Предыдущая страница"><ArrowLeft size={17} /></button>
          {paginationItems(catalogPage, catalogInfo.totalPages).map((item) => typeof item === 'number'
            ? <button className={item === catalogPage ? 'active' : ''} key={item} onClick={() => changeCatalogPage(item)} aria-current={item === catalogPage ? 'page' : undefined}>{item}</button>
            : <span key={item}>…</span>)}
          <button className="page-arrow" disabled={catalogPage === catalogInfo.totalPages} onClick={() => changeCatalogPage(catalogPage + 1)} aria-label="Следующая страница"><ArrowRight size={17} /></button>
        </nav>}
      </>}

      {tab === 'plan' && <>
        <section className="page-heading"><div><span className="muted-label">ПЛАНИРОВЩИК</span><h1>Твой ритм</h1></div><button className="round-add" onClick={() => setSheet('task')} aria-label="Новая задача"><Plus size={22} /></button></section>
        <section className="planner-summary"><div><CalendarDays size={22} /><span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span></div><strong>{tasks.filter((task) => task.done).length} из {tasks.length}</strong><p>задач выполнено</p><div className="thin-track"><i style={{ width: `${tasks.length ? tasks.filter((task) => task.done).length / tasks.length * 100 : 0}%` }} /></div></section>
        <div className="segmented task-period"><button className={taskFilter === 'today' ? 'active' : ''} onClick={() => setTaskFilter('today')}>Сегодня</button><button className={taskFilter === 'inbox' ? 'active' : ''} onClick={() => setTaskFilter('inbox')}>Без даты</button><button className={taskFilter === 'all' ? 'active' : ''} onClick={() => setTaskFilter('all')}>Все</button></div>
        <div className="task-filters"><label><Filter size={14} /><select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value as typeof taskStatus)}><option value="all">Любой статус</option><option value="active">Активные</option><option value="done">Выполненные</option></select></label>
          <label><select value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)}><option value="all">Все разделы</option>{allCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><ArrowUpDown size={14} /><select value={taskSort} onChange={(event) => setTaskSort(event.target.value as typeof taskSort)}><option value="date">По дате</option><option value="created">Сначала новые</option><option value="title">По названию</option></select></label></div>
        <div className="task-timeline">{visibleTasks.map((task) => <article className={`task-card ${task.done ? 'done' : ''} ${!task.startTime ? 'no-time' : ''}`} key={task.id}>
          <div className="task-time">{task.startTime ?? '—'}<i /></div><button className="task-check" onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} aria-label="Изменить статус">{task.done ? <CheckCircle2 size={25} /> : <Circle size={25} />}</button>
          <div className="task-copy"><span className={`task-category ${task.category}`}>{task.category === 'Тренировка' && <Dumbbell size={12} />}{task.category}</span><h3>{task.title}</h3>
            {task.description && <p>{task.description}</p>}<small>{task.date ? new Date(`${task.date}T12:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без даты'}{task.startTime ? ` · ${task.startTime}–${task.endTime}` : ' · без времени'}{task.repeat.length > 0 ? ` · ↻ ${task.repeat.length === 7 ? 'каждый день' : `${task.repeat.length} дн./нед.`}` : ''}</small></div>
          <button className="task-more" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))} aria-label="Удалить задачу"><Trash2 size={16} /></button></article>)}
          {!visibleTasks.length && <div className="empty-state"><CalendarDays size={28} /><h3>Здесь пока пусто</h3><p>Измените фильтры или создайте новую задачу.</p></div>}</div>
        <section className="coach-bridge"><div className="kimi-avatar"><Sparkles size={21} /></div><div><strong>Связать план и питание?</strong><p>Помощник учтёт время тренировки и подскажет, когда поесть.</p></div><button onClick={() => { setTab('coach'); sendChat('Как питаться вокруг тренировки?') }}><ArrowRight size={18} /></button></section>
      </>}

      {tab === 'coach' && <section className="coach-screen"><div className="coach-heading"><div className="kimi-avatar large"><Sparkles size={25} /></div><div><h1>Помощник</h1><span><i /> знает твой дневник</span></div><button className="icon-button" onClick={() => { setMessages([]); setChatError('') }} aria-label="Очистить диалог"><MoreHorizontal size={22} /></button></div>
        <div className="context-chips"><span><Flame size={13} /> {Math.round(todayTotals.calories ?? 0)} ккал</span><span>Белок {Math.round(todayTotals.protein ?? 0)} г</span><span><Dumbbell size={13} /> {tasks.filter((task) => task.category === 'Тренировка' && !task.done).length} тренировка</span></div>
        <div className="chat-stream"><div className="chat-message assistant"><div className="mini-spark"><Sparkles size={14} /></div><div><p>Привет! Я вижу, что ты сегодня ел, твою норму и план тренировок. Могу помочь добрать норму без случайных продуктов.</p><span>Только что</span></div></div>
          {messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}>{message.role === 'assistant' && <div className="mini-spark"><Sparkles size={14} /></div>}<div>{message.role === 'assistant' ? <MarkdownMessage text={message.text} /> : <p>{message.text}</p>}{(message.foods ?? (message.food ? [message.food] : [])).map((food, index) => <ChatFoodCard key={`${food.product.id}-${index}`} food={food} preferredGrams={productPortions[food.product.id]} onAdd={addChatFood} />)}{(message.recipes ?? []).map((recipe, index) => <ChatRecipeCard key={`${recipe.name}-${index}`} recipe={recipe} onSave={persistRecipe} onAdd={addChatFood} />)}</div></div>)}
          {chatLoading && <div className="chat-message assistant"><div className="mini-spark"><Sparkles size={14} /></div><div className="typing"><i /><i /><i /></div></div>}
          {chatError && <div className="request-error chat-request-error" role="alert"><div><strong>Не удалось получить ответ</strong><p>{chatError}</p></div><button type="button" onClick={() => void sendChat(undefined, messages)} disabled={chatLoading}>Повторить</button></div>}<div ref={chatEnd} /></div>
        {messages.length === 0 && <div className="prompt-chips"><button onClick={() => sendChat('Что приготовить на ужин?')}>Что на ужин?</button><button onClick={() => sendChat('Как питаться вокруг тренировки?')}>Еда и тренировка</button></div>}
        <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendChat() }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Спроси про еду или тренировку…" /><button type="submit" disabled={!chatInput.trim() || chatLoading}><Send size={18} /></button></form>
        <div className="demo-note">Ответы ИИ · проверяйте рекомендации</div></section>}
    </main>
    <nav className="bottom-nav">{([['today', Home, 'Сегодня'], ['food', Utensils, 'Питание'], ['plan', CalendarDays, 'План'], ['coach', MessageCircle, 'Помощник']] as const).map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setQuickOpen(false); setCameraOpen(false); if (id === 'food') openCatalog(); else setTab(id) }}><Icon size={21} /><span>{label}</span>{id === 'coach' && <i />}</button>)}</nav>
  </div>

    {selectedProduct && <SheetModal title={selectedProduct.name} subtitle={productDetails ? 'Описание и состав на 100 г' : `${selectedProduct.category} · состав на ${grams} г`} onClose={closeProduct}>
      <div className="product-sheet-hero"><div className="product-hero-main"><div className="food-emoji xl">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt="" /> : selectedProduct.emoji}</div><div className="product-hero-info"><strong>{selectedProduct.category}</strong><span>{selectedProduct.note || 'Состав и пищевая ценность на 100 г'}</span></div></div><button className={isFavorite(selectedProduct.id) ? 'favorite active' : 'favorite'} onClick={() => toggleFavorite(selectedProduct.id)}><Heart size={20} fill={isFavorite(selectedProduct.id) ? 'currentColor' : 'none'} />{isFavorite(selectedProduct.id) ? 'В избранном' : 'В избранное'}</button></div>
      {productDetails ? <div className="product-page">
        <div className="product-description"><span>{selectedProduct.category} · {selectedProduct.source === 'usda' ? 'USDA' : selectedProduct.source === 'openfoodfacts' ? 'Open Food Facts' : selectedProduct.source === 'ai' ? 'Оценка ИИ' : selectedProduct.source === 'recipe' ? 'Личный рецепт' : selectedProduct.source === 'custom' ? 'Данные с этикетки' : 'Локальный каталог'}</span><p>{selectedProduct.note || 'Описание продукта пока не добавлено.'}</p>{selectedRecipe?.instructions && <p className="recipe-instructions-view"><strong>Как готовить</strong>{selectedRecipe.instructions}</p>}<small>Все количества и проценты дневной нормы ниже рассчитаны на 100 г продукта.</small></div>
        <div className="sheet-nutrients product-page-macros"><div><strong>{Math.round(selectedProduct.nutrients.calories ?? 0)}</strong><span>ккал</span></div><div><strong>{(selectedProduct.nutrients.protein ?? 0).toFixed(1)}</strong><span>белки, г</span></div><div><strong>{(selectedProduct.nutrients.fat ?? 0).toFixed(1)}</strong><span>жиры, г</span></div><div><strong>{(selectedProduct.nutrients.carbs ?? 0).toFixed(1)}</strong><span>углеводы, г</span></div></div>
        <h3>Все имеющиеся нутриенты · 100 г</h3><NutrientProfileList product={selectedProduct} grams={100} goals={goals} showAll />
        <button className="secondary-button product-back" onClick={() => setProductDetails(false)}><ArrowLeft size={16} /> Вернуться к порции</button>
      </div> : <>
        <div className="sheet-nutrients"><div><strong>{Math.round((selectedProduct.nutrients.calories ?? 0) * grams / 100)}</strong><span>ккал</span></div><div><strong>{((selectedProduct.nutrients.protein ?? 0) * grams / 100).toFixed(1)}</strong><span>белки, г</span></div><div><strong>{((selectedProduct.nutrients.fat ?? 0) * grams / 100).toFixed(1)}</strong><span>жиры, г</span></div><div><strong>{((selectedProduct.nutrients.carbs ?? 0) * grams / 100).toFixed(1)}</strong><span>углеводы, г</span></div></div>
        {selectedRecipe && <div className="recipe-portion-ingredients"><strong>Ингредиенты на {Math.round(grams)} г</strong>{scaledRecipeIngredients(selectedRecipe, grams).map((item) => <div key={item.product.id}><span>{item.product.emoji} {item.product.name}</span><b>{item.grams} г</b></div>)}</div>}
        <div className="portion-label"><label htmlFor="portion-grams">Порция, граммы</label><div className="portion-control"><button onClick={() => setGrams(Math.max(0, grams - 10))} aria-label="Уменьшить порцию">−</button><div className="portion-value"><NumericInput ariaLabel="Порция, граммы" value={grams} onValue={setGrams} /><span>г</span></div><button onClick={() => setGrams(Math.min(5000, grams + 10))} aria-label="Увеличить порцию">+</button></div></div>
        <div className="portion-presets">{[50, 100, 150, 200].map((amount) => <button className={grams === amount ? 'active' : ''} key={amount} onClick={() => setGrams(amount)}>{amount} г</button>)}</div>
        <fieldset className="meal-selector"><legend>Приём пищи</legend><div className="meal-options">{meals.map((item) => <button type="button" className={meal === item ? 'active' : ''} aria-pressed={meal === item} key={item} onClick={() => setMeal(item)}>{item}</button>)}</div></fieldset>
        <button className="secondary-button product-page-button" onClick={() => setProductDetails(true)}>О продукте<ChevronRight size={17} /></button>
        {grams <= 0 && <p className="form-error">Укажите массу больше 0 г</p>}
        <button className="primary-button" disabled={grams <= 0} onClick={() => addFood(selectedProduct)}>{editingEntryId ? <Check size={18} /> : <Plus size={18} />}{editingEntryId ? 'Сохранить изменения' : `Добавить в ${meal.toLowerCase()}`}</button>
      </>}</SheetModal>}

    {sheet === 'photo' && <SheetModal title="Еда по фото" subtitle="Проверьте продукты и массу каждой порции" onClose={closePhoto}>
      <label className={`photo-dropzone ${photo ? 'has-photo' : ''}`}>{photo ? photo.file.type === 'application/pdf' ? <div className="pdf-preview"><BookOpen size={32} /><strong>{photo.file.name}</strong><span>Читаем отчёт о составе тела</span></div> : <img src={photo.url} alt="Загруженное блюдо" /> : <><div><Camera size={30} /></div><strong>Сфотографируйте еду</strong><span>или выберите снимок / PDF из галереи</span></>}<input type="file" accept="image/*,.pdf,application/pdf" disabled={photoLoading} onChange={(event) => handlePhoto(event.target.files?.[0])} /></label>
      {photoLoading && <div className="analysis-loading"><LoaderCircle className="spin" size={22} /><div><strong>Подготавливаем и анализируем фото…</strong><span>Ищем все продукты и напитки, затем их состав в каталоге</span></div></div>}
      {photoError && <div className="request-error" role="alert"><div><strong>Не удалось распознать фото</strong><p>{photoError}</p></div><button type="button" onClick={() => void handlePhoto(photo?.file)} disabled={!photo || photoLoading}>Повторить</button></div>}
      {photoResult && <div className="photo-result"><div className="result-label"><CheckCircle2 size={16} /> {photoResult.items.length ? `Найдено продуктов: ${photoResult.items.length}` : 'Все продукты добавлены'}</div>
        {photoResult.unrecognized.length > 0 && <p className="photo-unrecognized">Не нашли в каталоге: {photoResult.unrecognized.join(', ')}. Добавьте их вручную.</p>}
        <div className="photo-items">{photoResult.items.map((item, index) => <article className="photo-item" key={`${item.product.id}-${item.recognizedName}-${index}`}>
          <div className="photo-item-product"><div className="food-emoji">{item.product.emoji}</div><div><h3>{item.product.name}</h3><p>Уверенность {Math.round(item.confidence * 100)}% · {Math.round(item.product.nutrients.calories * item.estimatedGrams / 100)} ккал</p></div></div>
          <div className="photo-item-grams"><NumericInput ariaLabel={`Масса: ${item.product.name}`} integer max={2000} value={item.estimatedGrams} onValue={(value) => updatePhotoGrams(index, value)} /><span>г</span></div>
          <button className="photo-item-add" onClick={() => addPhotoItem(item, index)} disabled={item.estimatedGrams <= 0} aria-label={`Добавить ${item.product.name}`}><Plus size={20} /></button>
        </article>)}</div>
        {photoResult.items.length > 0 ? <>
          <label className="field-label">Приём пищи<select className="text-input" value={meal} onChange={(event) => setMeal(event.target.value as Meal)}>{meals.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="primary-button" onClick={addAllPhotoItems} disabled={photoResult.items.some((item) => item.estimatedGrams <= 0)}>Добавить все · {photoResult.items.length}<ArrowRight size={18} /></button>
        </> : <button className="primary-button" onClick={closePhoto}>Готово<Check size={18} /></button>}
      </div>}
      {!photo && <div className="privacy-note"><Leaf size={16} /><span>Фото используется только для анализа. Не загружайте снимки с личными данными.</span></div>}</SheetModal>}

    {sheet === 'barcode' && <SheetModal title="Продукт по штрихкоду" subtitle="Камера открывается сразу · можно ввести код вручную" onClose={() => setSheet(null)}><BarcodeScanner onMissing={(code) => { setPackageBarcode(code); setSheet('package') }} onProduct={(product) => { setRemoteProducts((current) => [product, ...current]); setSheet(null); openProduct(product) }} /></SheetModal>}
    {sheet === 'package' && <SheetModal title="Добавить по этикетке" subtitle="Название и пищевая ценность с упаковки" onClose={() => setSheet(null)}><PackagedProductForm barcode={packageBarcode} onProduct={(product) => { setRemoteProducts((current) => [product, ...current]); setSheet(null); openProduct(product); setToast('Продукт сохранён в общем каталоге') }} /></SheetModal>}
    {sheet === 'recipe' && <SheetModal title={editingRecipe ? 'Редактировать рецепт' : 'Новый рецепт'} subtitle="Только вы видите свои рецепты" onClose={() => { setSheet(null); setEditingRecipe(null) }}><RecipeEditor initial={editingRecipe} onSave={async (draft) => { await persistRecipe(draft); setSheet(null); setEditingRecipe(null); setToast('Рецепт сохранён') }} onDelete={editingRecipe ? () => removeRecipe(editingRecipe.id) : undefined} /></SheetModal>}
    {sheet === 'nutrients' && <SheetModal title="Витамины и минералы" subtitle={`${dateLabel}: факт, норма и назначение нутриентов`} onClose={() => setSheet(null)}>
      <div className="nutrient-day-list">{nutrientDefinitions.map((definition) => {
        const amount = totals[definition.key] ?? 0
        const goal = goals[definition.key] ?? 0
        const percent = goal > 0 ? amount / goal * 100 : null
        const active = favoriteNutrients.includes(definition.key)
        return <article className={`nutrient-choice ${nutrientFocus === definition.key ? 'focused' : ''}`} data-nutrient={definition.key} key={definition.key}>
          <div className="nutrient-choice-heading"><div><strong>{definition.name}</strong><span>{nutrientBenefit(definition.key)}</span></div><button className={active ? 'favorite active' : 'favorite'} onClick={() => toggleFavoriteNutrient(definition.key)} aria-label={`${active ? 'Убрать из избранного' : 'Добавить в избранное'}: ${definition.name}`} aria-pressed={active}><Heart size={19} fill={active ? 'currentColor' : 'none'} /></button></div>
          <div className="nutrient-choice-values"><strong>{formatNutrient(definition.key, amount)}{goal > 0 ? ` / ${formatNutrient(definition.key, goal)}` : ''}</strong><b>{percent === null ? 'Норма не задана' : `${Math.round(percent)}% ДН`}</b></div>
          <div className="nutrient-track"><i style={{ width: `${Math.min(100, percent ?? 0)}%` }} /></div>
        </article>
      })}</div>
      <button className="primary-button" onClick={() => setSheet(null)}>Готово · избранных: {favoriteNutrients.length}<Check size={18} /></button>
    </SheetModal>}
    {sheet === 'task' && <SheetModal title="Новая задача" subtitle="Дата и время необязательны" onClose={() => setSheet(null)}><TaskForm categories={allCategories} onCategories={setCategories} onAdd={(task) => { setTasks((current) => [...current, task]); setSheet(null); setToast('Задача добавлена') }} /></SheetModal>}
    {sheet === 'profile' && <SheetModal title="Личный профиль" subtitle="Нормы пересчитаются автоматически" onClose={() => setSheet(null)}><ProfileForm profile={profile} onSave={(next) => { setProfile(next); setSheet(null); setToast('Персональные нормы обновлены') }} onLogout={() => { void logoutServer(); setServerReady(false); setPhone(null); setSheet(null) }} /></SheetModal>}
    {cameraHintOpen && <div className="camera-hint" role="alertdialog" aria-modal="false" aria-label="Совет перед съёмкой"><Camera size={26} /><div><strong>Еда на фото должна быть хорошо видна</strong><p>Снимайте при хорошем освещении, без бликов и лишних предметов в кадре.</p></div><button className="camera-hint-close" onClick={() => setCameraHintOpen(false)} aria-label="Закрыть совет"><X size={17} /></button><button className="camera-hint-open" onClick={confirmCameraOpen}>Открыть камеру</button></div>}
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

function ProfileForm({ profile, onSave, onLogout }: { profile: UserProfile, onSave: (profile: UserProfile) => void, onLogout: () => void }) {
  const [draft, setDraft] = useState(profile)
  const estimated = calculateGoals(draft)
  const bmr = calculateBmr(draft)
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const valid = draft.birthYear >= 1910 && draft.birthYear <= new Date().getFullYear() - 18 && draft.weight >= 35 && draft.weight <= 300 && draft.height >= 120 && draft.height <= 230
  const optionalField = (key: 'bodyFatPercent' | 'skeletalMuscleKg' | 'leanBodyMassKg' | 'bodyWaterPercent' | 'visceralFatLevel', label: string, max: number) => <label className="field-label">{label}<input className="text-input" type="number" inputMode="decimal" min="0" max={max} step="0.1" value={draft[key] ?? ''} onChange={(event) => update(key, event.target.value === '' ? undefined : Number(event.target.value))} /></label>
  return <form className="profile-form" onSubmit={(event) => { event.preventDefault(); if (valid) onSave(draft) }}>
    <div className="profile-form-icon"><UserRound size={24} /></div><p className="profile-explanation">Для расчёта нужны возраст, рост и вес. Указывайте текущие значения — формула даёт стартовую оценку, а не медицинское назначение.</p>
    <div className="form-row"><label className="field-label">Год рождения<NumericInput className="text-input" ariaLabel="Год рождения" integer max={new Date().getFullYear() - 18} value={draft.birthYear} onValue={(value) => update('birthYear', value)} /></label>
      <label className="field-label">Пол<select className="text-input" value={draft.sex} onChange={(event) => update('sex', event.target.value as UserProfile['sex'])}><option value="male">Мужской</option><option value="female">Женский</option></select></label></div>
    <div className="form-row"><label className="field-label">Вес, кг<NumericInput className="text-input" ariaLabel="Вес, кг" max={300} value={draft.weight} onValue={(value) => update('weight', value)} /></label>
      <label className="field-label">Рост, см<NumericInput className="text-input" ariaLabel="Рост, см" integer max={230} value={draft.height} onValue={(value) => update('height', value)} /></label></div>
    <label className="field-label">Подвижность<select className="text-input" value={draft.activity} onChange={(event) => update('activity', event.target.value as UserProfile['activity'])}><option value="sedentary">Сидячий образ жизни</option><option value="light">Лёгкие нагрузки 1–3 раза в неделю</option><option value="moderate">Тренировки 3–5 раз в неделю</option><option value="high">Интенсивные 6–7 раз в неделю</option><option value="athlete">Спорт или тяжёлая физическая работа</option></select></label>
    <div className="goal-picker">{([['lose', 'Снизить вес'], ['maintain', 'Сохранить'], ['gain', 'Набрать массу']] as const).map(([value, label]) => <button type="button" key={value} className={draft.goal === value ? 'active' : ''} onClick={() => update('goal', value)}>{label}</button>)}</div>
    <section className="body-metrics"><div className="section-title"><h3>Состав тела</h3><span>необязательно</span></div><p>Безжировая масса уточняет базовый обмен. Мышцы не прибавляются к калориям отдельно — это исключает повторный учёт.</p>
      <div className="form-row">{optionalField('bodyFatPercent', 'Жир, %', 75)}{optionalField('skeletalMuscleKg', 'Мышцы, кг', 100)}</div>
      <div className="form-row">{optionalField('leanBodyMassKg', 'Безжировая масса, кг', 250)}{optionalField('bodyWaterPercent', 'Вода, %', 85)}</div>
      {optionalField('visceralFatLevel', 'Уровень висцерального жира', 30)}
      <BodyImportButton onMetrics={(metrics) => setDraft((current) => ({ ...current, ...metrics }))} /></section>
    <div className="profile-estimate"><span><Settings2 size={15} /> {bmr.formula} + активность</span><div><strong>{estimated.calories} ккал</strong><span>Б {estimated.protein} г · Ж {estimated.fat} г · У {estimated.carbs} г</span></div><small>{draft.goal === 'lose' ? 'Дефицит 15%' : draft.goal === 'gain' ? 'Профицит 10%' : 'Поддержание'} · базовый обмен {Math.round(bmr.value)} ккал</small></div>
    {!valid && <p className="form-error">Проверьте год, вес от 35 кг и рост от 120 см</p>}
    <button className="primary-button" type="submit" disabled={!valid}>Сохранить профиль<Check size={18} /></button><button className="logout-button" type="button" onClick={onLogout}><LogOut size={16} /> Выйти из аккаунта</button>
  </form>
}

function TaskForm({ onAdd, categories, onCategories }: { onAdd: (task: Task) => void, categories: string[], onCategories: (categories: string[]) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hasDate, setHasDate] = useState(true)
  const [date, setDate] = useState(todayISO())
  const [hasTime, setHasTime] = useState(true)
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('19:00')
  const [category, setCategory] = useState(categories[0] ?? 'Личное')
  const [customCategory, setCustomCategory] = useState('')
  const [repeat, setRepeat] = useState<number[]>([])
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const changeStart = (value: string) => { setStartTime(value); const [hours, minutes] = value.split(':').map(Number); setEndTime(`${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`) }
  const addCategory = () => { const value = customCategory.trim(); if (!value) return; if (!categories.includes(value)) onCategories([...categories, value]); setCategory(value); setCustomCategory('') }
  return <form className="task-form" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return
    onAdd({ id: uid(), title: title.trim(), description: description.trim(), date: hasDate ? date : null, startTime: hasDate && hasTime ? startTime : null, endTime: hasDate && hasTime ? endTime : null, category, done: false, repeat: hasDate ? repeat : [], createdAt: new Date().toISOString() }) }}>
    <label className="field-label">Название<input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, тренировка ног" autoFocus required maxLength={300} /></label>
    <label className="field-label">Описание<textarea className="text-input task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Детали, ссылка или заметка" maxLength={5000} /></label>
    <div className="toggle-field"><span><strong>Дата</strong><small>Можно оставить задачу в общем списке</small></span><button type="button" className={hasDate ? 'switch active' : 'switch'} onClick={() => setHasDate(!hasDate)} aria-label="Указать дату"><i /></button></div>
    {hasDate && <><label className="field-label">День<input className="text-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <div className="toggle-field"><span><strong>Время выполнения</strong><small>По умолчанию продолжительность 1 час</small></span><button type="button" className={hasTime ? 'switch active' : 'switch'} onClick={() => setHasTime(!hasTime)} aria-label="Указать время"><i /></button></div>
      {hasTime && <div className="form-row"><label className="field-label">Начало<input className="text-input" type="time" value={startTime} onChange={(event) => changeStart(event.target.value)} /></label><label className="field-label">Конец<input className="text-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>}</>}
    <label className="field-label">Раздел<select className="text-input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    <div className="custom-category"><input className="text-input" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Свой раздел, например «Работа»" maxLength={60} /><button type="button" onClick={addCategory} disabled={!customCategory.trim()}><Plus size={17} /></button></div>
    {hasDate && <div className="field-label">Повторять по дням<div className="weekday-picker">{weekdays.map((day, index) => { const value = index === 6 ? 0 : index + 1
      return <button type="button" key={day} className={repeat.includes(value) ? 'active' : ''} onClick={() => setRepeat((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}>{day}</button> })}</div></div>}
    <button className="primary-button" type="submit"><Plus size={18} /> Добавить задачу</button></form>
}
