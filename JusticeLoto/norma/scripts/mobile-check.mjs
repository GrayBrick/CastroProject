import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const artifacts = path.join(root, 'artifacts', 'mobile-check')
await mkdir(artifacts, { recursive: true })
const server = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '7100', '--strictPort'], { stdio: 'pipe' })
let browser
const checks = []
const check = (name) => { checks.push(name); console.log(`PASS ${name}`) }
const tap = async (locator, scroll = true) => {
  await locator.waitFor({ state: 'visible' })
  if (scroll) await locator.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await locator.page().waitForTimeout(350)
  const box = await locator.boundingBox()
  if (!box) throw new Error('Элемент для касания не отображается')
  await locator.page().touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
}

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 20000)
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Local:')) { clearTimeout(timeout); resolve() }
    })
    server.stderr.on('data', (data) => console.error(data.toString()))
    server.on('error', reject)
    server.on('exit', (code) => { if (code) reject(new Error(`Vite exited with ${code}`)) })
  })
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.route('**/api/products/barcode/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ product: {
      id: 'off-4607025392113', name: 'Йогурт клубничный', category: 'Упакованные продукты', emoji: '🍽️',
      note: 'Open Food Facts · тестовый ответ', source: 'openfoodfacts', barcode: '4607025392113', servingGrams: 250,
      nutrients: { calories: 82, protein: 3.2, fat: 2.5, carbs: 11.4, sugars: 10.8, calcium: 120, vitaminB2: 0.2, vitaminB12: 0.4, phosphorus: 95 },
    } }) })
  })
  let favoriteRequestIds = ''
  await page.route('**/api/products?*', async (route) => {
    const url = new URL(route.request().url())
    if (!url.searchParams.has('favorites')) return route.continue()
    favoriteRequestIds = url.searchParams.get('favorites') ?? ''
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: 2, page: 1, pageSize: 30, totalPages: 1, products: [
      { id: 'apple', name: 'Яблоко', category: 'Фрукты', emoji: '🍎', note: 'Тестовый ответ', source: 'local', nutrients: { calories: 52, protein: 0.3, fat: 0.2, carbs: 14 } },
      { id: 'favorite-outside-first-page', name: 'Помело из избранного', category: 'Фрукты', emoji: '🍊', note: 'Не было на первой странице каталога', source: 'usda', nutrients: { calories: 38, protein: 0.8, fat: 0, carbs: 9.6, vitaminC: 61 } },
    ] }) })
  })
  let photoShouldFail = false
  await page.route('**/api/kimi/analyze-food', async (route) => {
    if (photoShouldFail) {
      photoShouldFail = false
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Тестовый сбой распознавания' }) })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      unrecognized: [],
      items: [
        { recognizedName: 'Яичница', confidence: 0.94, estimatedGrams: 120, product: { id: 'fried-eggs', name: 'Яичница', category: 'Блюда из яиц', emoji: '🍳', note: 'Тестовый ответ API', source: 'local', nutrients: { calories: 196, protein: 13, fat: 15, carbs: 1 } } },
        { recognizedName: 'Брокколи', confidence: 0.91, estimatedGrams: 100, product: { id: 'broccoli-photo', name: 'Брокколи', category: 'Овощи', emoji: '🥦', note: 'Тестовый ответ API', source: 'local', nutrients: { calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6 } } },
        { recognizedName: 'Кофе', confidence: 0.88, estimatedGrams: 200, product: { id: 'coffee-photo', name: 'Кофе', category: 'Напитки', emoji: '☕', note: 'Тестовый ответ API', source: 'local', nutrients: { calories: 2, protein: 0.1, fat: 0, carbs: 0 } } },
      ],
    }) })
  })
  await page.route('**/api/kimi/chat', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      text: 'До тренировки осталось добрать:\nПервая строка\nВторая строка\n\n- **Белок** — 54 г\n- Углеводы — 102 г\n\nПроверочный ответ серверного API.',
      foods: [
        { suggestedGrams: 150, product: { id: 'ai-pomelo', name: 'Помело', category: 'Фрукты', emoji: '🍊', note: 'Оценка ИИ на 100 г · проверьте состав', source: 'ai', nutrients: { calories: 38, protein: 0.8, fat: 0, carbs: 9.6, vitaminC: 61 } } },
        { suggestedGrams: 220, product: { id: 'big-hit', name: 'Биг Хит', category: 'Готовые блюда', emoji: '🍔', note: 'Стандартизированный продукт', source: 'ai', nutrients: { calories: 250, protein: 13, fat: 12, carbs: 23 } } },
        { suggestedGrams: 120, product: { id: 'fries', name: 'Картошка фри', category: 'Готовые блюда', emoji: '🍟', note: 'Тестовый ответ', source: 'local', nutrients: { calories: 312, protein: 3.4, fat: 15, carbs: 41 } } },
      ],
    }) })
  })

  await page.goto('http://127.0.0.1:7100/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(artifacts, '01-auth.png'), fullPage: true })
  const phone = page.getByPlaceholder('+7 917 513-33-15')
  await phone.fill('89175133315')
  if (await phone.inputValue() !== '+7 917 513-33-15') throw new Error('Неверная маска телефона')
  await page.getByRole('button', { name: 'Продолжить' }).click()
  const code = page.getByPlaceholder('••••')
  await code.fill('2410')
  await page.getByRole('heading', { name: 'Твой баланс' }).waitFor()
  if (await page.evaluate(() => document.activeElement?.getAttribute('placeholder')) === '••••') throw new Error('Курсор кода не скрыт')
  check('Маска телефона, blur и автоматический вход после 4 цифр')

  const compressed = await page.evaluate(async () => {
    const { prepareFoodPhoto } = await import('/src/lib/kimi.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 2400; canvas.height = 1200
    const context = canvas.getContext('2d')
    context.fillStyle = '#6b8e23'; context.fillRect(0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    const result = await prepareFoodPhoto(new File([blob], 'large.png', { type: 'image/png' }))
    const bitmap = await createImageBitmap(result)
    const dimensions = { width: bitmap.width, height: bitmap.height, type: result.type }
    bitmap.close()
    return dimensions
  })
  if (compressed.width !== 1280 || compressed.height !== 640 || compressed.type !== 'image/jpeg') throw new Error(`Неверное сжатие фото: ${JSON.stringify(compressed)}`)
  check('Фото уменьшается до 1280 px с пропорциями и конвертируется в JPEG')

  await page.getByRole('button', { name: 'Личный профиль' }).click()
  await page.getByLabel('Год рождения').fill('1990')
  await page.getByLabel('Вес, кг').fill('82')
  await page.getByRole('button', { name: 'Снизить вес' }).click()
  await page.getByText('Дефицит 15%', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Сохранить профиль' }).click()
  await page.getByText('Персональные нормы обновлены').waitFor()
  check('Профиль и персональный пересчёт калорий и макронутриентов')
  await page.screenshot({ path: path.join(artifacts, '02-dashboard.png'), fullPage: true })

  await page.locator('.bottom-nav').getByRole('button', { name: 'Питание' }).click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('творог')
  const cottage = page.locator('.product-row').filter({ hasText: 'Творог 5%' })
  if (await cottage.locator('.product-highlights span').count() !== 3) throw new Error('В карточке не три ключевых нутриента')
  await cottage.locator('.product-main').click()
  await page.locator('.product-hero-info').getByText('Классический, 5% жирности', { exact: true }).waitFor()
  if (await page.locator('.meal-options button').count() !== 4 || await page.locator('.meal-selector select').count()) throw new Error('Приёмы пищи не представлены четырьмя отдельными кнопками')
  const controlHeights = await page.locator('.sheet').evaluate((sheet) => ({
    meal: sheet.querySelector('.meal-options button').getBoundingClientRect().height,
    about: sheet.querySelector('.product-page-button').getBoundingClientRect().height,
  }))
  if (Math.abs(controlHeights.meal - controlHeights.about) > 1) throw new Error(`«О продукте» отличается по высоте: ${JSON.stringify(controlHeights)}`)
  await page.waitForTimeout(2600)
  await page.screenshot({ path: path.join(artifacts, '02-product-sheet.png'), fullPage: true })
  await page.getByRole('button', { name: 'О продукте' }).click()
  if (await page.locator('.product-page .nutrient-profile-row').count() < 1) throw new Error('Страница продукта не содержит доступных нутриентов')
  await page.getByRole('button', { name: 'Вернуться к порции' }).click()
  await page.locator('.portion-control input').fill('200')
  await page.locator('.meal-options').getByRole('button', { name: 'Ужин', exact: true }).click()
  if (await page.locator('.meal-options').getByRole('button', { name: 'Ужин', exact: true }).getAttribute('aria-pressed') !== 'true') throw new Error('Кнопка ужина не выбирается')
  await page.getByRole('button', { name: 'Добавить в ужин' }).click()
  await page.locator('.bottom-nav').getByRole('button', { name: 'Питание' }).click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('творог')
  await page.locator('.product-row').filter({ hasText: 'Творог 5%' }).locator('.product-main').click()
  if (await page.locator('.portion-control input').inputValue() !== '200') throw new Error('Последняя персональная масса не подставилась')
  await page.getByRole('button', { name: 'Закрыть' }).click()
  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await page.getByText('Творог 5%', { exact: true }).waitFor()
  check('Русский поиск, описание у иконки, нутриенты и персональная порция 200 г')

  await page.locator('.bottom-nav').getByRole('button', { name: 'Питание' }).click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('яблоко')
  await page.locator('.product-row').filter({ hasText: 'Яблоко' }).locator('.favorite').click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('')
  await page.locator('.segmented').getByRole('button', { name: /Избранное/ }).click()
  await page.locator('.product-row').filter({ hasText: 'Яблоко' }).waitFor()
  await page.locator('.product-row').filter({ hasText: 'Помело из избранного' }).waitFor()
  if (!favoriteRequestIds.split(',').includes('apple') || await page.locator('.product-row').count() !== 2) throw new Error('Серверный фильтр не получил все идентификаторы избранного')
  check('Избранное загружается с сервером, включая продукты вне первой страницы')
  await page.screenshot({ path: path.join(artifacts, '03-catalog.png'), fullPage: true })

  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await page.getByRole('button', { name: 'Камера', exact: true }).click()
  await page.getByRole('button', { name: 'Камера', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть камеру', exact: true }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const imagePath = path.join(artifacts, 'test-food.png')
  await writeFile(imagePath, png)
  photoShouldFail = true
  await page.locator('.photo-dropzone input').setInputFiles(imagePath)
  await page.getByRole('alert').filter({ hasText: 'Распознавание фото временно недоступно' }).waitFor({ timeout: 10000 })
  if (await page.locator('.photo-result').count() || await page.getByText('ДЕМО', { exact: true }).count()) throw new Error('При ошибке API показан подменный результат')
  check('Ошибка распознавания показывается без фиктивного продукта')
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await page.getByText('Найдено продуктов: 3').waitFor({ timeout: 10000 })
  if (await page.locator('.photo-item').count() !== 3) throw new Error('Не все позиции с фото показаны')
  check('Повтор показывает яичницу, брокколи и кофе как отдельные продукты')
  await page.screenshot({ path: path.join(artifacts, '04-photo.png'), fullPage: true })
  await page.getByLabel('Масса: Яичница').fill('140')
  await page.locator('.photo-item').filter({ hasText: 'Яичница' }).getByRole('button', { name: 'Добавить Яичница' }).click()
  if (await page.locator('.photo-item').count() !== 2 || await page.locator('.photo-items').getByText('Яичница', { exact: true }).count()) throw new Error('Добавленный продукт не исчез из списка')
  await page.getByRole('button', { name: 'Добавить все · 2' }).click()
  await page.getByRole('dialog', { name: 'Еда по фото' }).waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Изменить Яичница' }).waitFor()
  if (!(await page.getByRole('button', { name: 'Изменить Яичница' }).innerText()).includes('140')) throw new Error('Изменённая масса не попала в дневник')
  if (await page.getByRole('button', { name: 'Изменить Брокколи' }).count() < 2) throw new Error('Брокколи с фото не добавлена в дневник')
  await page.getByRole('button', { name: 'Изменить Кофе' }).waitFor()
  check('Масса редактируется, плюс добавляет одну позицию, «Добавить все» переносит остальные')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await tap(page.getByRole('button', { name: 'Сканировать штрихкод' }), false)
  await page.getByPlaceholder('4607025392113').fill('4607025392113')
  await page.locator('.barcode-input button').click()
  await page.getByRole('dialog', { name: 'Йогурт клубничный' }).waitFor()
  if (await page.locator('.portion-control input').inputValue() !== '250') throw new Error('Официальная масса порции не подставилась')
  check('Штрихкод открывает продукт и подставляет официальную порцию 250 г')
  await page.getByRole('button', { name: 'Закрыть' }).click()

  await page.locator('.bottom-nav').getByRole('button', { name: 'План' }).click()
  await page.locator('.round-add').click()
  await page.getByPlaceholder('Например, тренировка ног').fill('Купить витамины')
  await page.getByPlaceholder('Детали, ссылка или заметка').fill('Сравнить состав и дозировку')
  await page.getByRole('button', { name: 'Указать дату' }).click()
  await page.getByPlaceholder('Свой раздел, например «Работа»').fill('Поручения')
  await page.locator('.custom-category button').click()
  await page.getByRole('button', { name: 'Добавить задачу' }).click()
  await page.locator('.task-period').getByRole('button', { name: 'Без даты' }).click()
  const task = page.locator('.task-card').filter({ hasText: 'Купить витамины' })
  await task.getByText('Сравнить состав и дозировку').waitFor()
  await task.getByText('Поручения', { exact: true }).waitFor()
  await task.getByText(/Без даты · без времени/).waitFor()
  await task.locator('.task-check').click()
  await page.locator('.task-filters select').first().selectOption('done')
  await page.locator('.task-card.done').filter({ hasText: 'Купить витамины' }).waitFor()
  check('Задача без даты и времени, описание, свой раздел, фильтры и статус')
  await page.screenshot({ path: path.join(artifacts, '05-tasks.png'), fullPage: true })

  await page.locator('.bottom-nav').getByRole('button', { name: 'Помощник' }).click()
  await page.getByPlaceholder('Спроси про еду или тренировку…').fill('Я сегодня ещё съел помело 180 г')
  await page.getByPlaceholder('Спроси про еду или тренировку…').press('Enter')
  await page.getByText(/До тренировки осталось добрать/).waitFor({ timeout: 10000 })
  check('Помощник отвечает с учётом дневника и тренировки')
  await page.locator('.markdown-message strong').getByText('Белок', { exact: true }).waitFor()
  if (await page.locator('.markdown-message li').count() !== 2 || await page.locator('.markdown-message br').count() < 2) throw new Error('Markdown или переносы строк не отображаются')
  if ((await page.locator('.markdown-message').innerText()).includes('**')) throw new Error('Markdown-маркеры видны как обычный текст')
  check('Markdown помощника: жирный текст, списки и переносы строк')
  if (await page.locator('.chat-food-card').count() !== 3) throw new Error('Несколько продуктов объединены или потеряны')
  await page.getByLabel('Масса: Биг Хит').waitFor()
  await page.getByLabel('Масса: Картошка фри').waitFor()
  check('Каждый продукт получает отдельную карточку, стандартизированный бургер не разбивается')
  const pomeloCard = page.locator('.chat-food-card').filter({ hasText: 'Помело' })
  await pomeloCard.getByText('Новый продукт · состав оценён ИИ на 100 г').waitFor()
  await page.getByLabel('Масса: Помело').fill('180')
  await page.screenshot({ path: path.join(artifacts, '06-coach.png'), fullPage: true })
  await pomeloCard.getByRole('button', { name: 'Добавить', exact: true }).click()
  await pomeloCard.getByRole('button', { name: 'Добавлено', exact: true }).waitFor()
  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  const chatEntry = page.getByRole('button', { name: 'Изменить Помело', exact: true })
  await chatEntry.waitFor()
  if (!(await chatEntry.innerText()).includes('180 г')) throw new Error('Масса из чата не попала в дневник')
  check('Чат создаёт карточку нового продукта, масса редактируется, еда добавляется в дневник')

  const bodyText = await page.locator('body').innerText()
  if (/kimi/i.test(bodyText)) throw new Error('В интерфейсе осталось видимое упоминание Kimi')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  if (overflow) throw new Error('Horizontal overflow detected')
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  check('Нет видимых упоминаний Kimi, переполнения и ошибок браузера')
  console.log(`\n${checks.length} мобильных сценариев успешно проверено.`)
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
