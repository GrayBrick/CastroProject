import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const artifacts = path.join(root, 'artifacts', 'interactions-check')
await mkdir(artifacts, { recursive: true })
const server = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '7101', '--strictPort'], { stdio: 'pipe' })
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
    server.stdout.on('data', (data) => { if (data.toString().includes('Local:')) { clearTimeout(timeout); resolve() } })
    server.on('error', reject)
    server.on('exit', (code) => { if (code) reject(new Error(`Vite exited with ${code}`)) })
  })
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => { window.__cameraRequested = true; throw new Error('Камера недоступна в тесте') },
    } })
  })
  let chatShouldFail = true
  await page.route('**/api/kimi/chat', async (route) => {
    if (chatShouldFail) {
      chatShouldFail = false
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Тестовый сбой помощника' }) })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: 'Реальный проверочный ответ API: учитывайте белок и время тренировки.' }) })
  })
  await page.goto('http://127.0.0.1:7101/', { waitUntil: 'networkidle' })
  await page.getByPlaceholder('+7 917 513-33-15').fill('70000000003')
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.getByPlaceholder('••••').fill('2410')
  await page.getByRole('heading', { name: 'Твой баланс' }).waitFor()

  if (await page.locator('.week-strip > button').count() !== 7 || await page.locator('.week-strip [data-macro-ring]').count() !== 21) throw new Error('Не у каждой даты три кольца Б/У/Ж')
  if (await page.locator('.calorie-segment').count() !== 3 || await page.locator('.calorie-segment[stroke-linecap="round"]').count() !== 3) throw new Error('Нет трёх скруглённых сегментов Б/У/Ж')
  if (await page.locator('.day-number i, .section-kicker').count()) throw new Error('Осталась точка даты или умная подсказка')
  const ringGeometry = await page.locator('.week-strip [data-macro-ring]').first().evaluate((ring) => ({
    radius: Number(ring.querySelector('circle').getAttribute('r')),
    stroke: Number(ring.querySelector('circle').getAttribute('stroke-width')),
  }))
  const ringRadii = await page.locator('.week-strip > button').first().locator('[data-macro-ring] circle').evaluateAll((circles) => circles.filter((_, index) => index % 2 === 0).map((circle) => Number(circle.getAttribute('r'))))
  if (ringGeometry.radius <= 0 || Math.abs((ringRadii[0] - ringRadii[1]) - ringGeometry.stroke) > 0.01) throw new Error('Между кольцами даты остался промежуток')
  const clockwise = await page.locator('.calorie-segment').first().evaluate((circle) => {
    const matrix = circle.getScreenCTM()
    const center = new DOMPoint(Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))).matrixTransform(matrix)
    const start = circle.getPointAtLength(0).matrixTransform(matrix)
    const next = circle.getPointAtLength(1).matrixTransform(matrix)
    return start.y < center.y && next.x > start.x
  })
  if (!clockwise) throw new Error('Калорийные дуги не начинаются сверху и не идут вправо по часовой')
  if (await page.evaluate(() => CSS.supports('corner-shape', 'squircle'))) {
    const corner = await page.locator('.balance-card').evaluate((element) => getComputedStyle(element).cornerShape)
    if (corner !== 'squircle' && corner !== 'superellipse(2)') throw new Error(`Скёркл не применён: ${corner}`)
  }
  const iconRadius = await page.locator('.fab-main').evaluate((element) => getComputedStyle(element).borderRadius)
  if (iconRadius !== '30%') throw new Error(`Радиус иконки не 30%: ${iconRadius}`)
  const layerOrder = await page.locator('.calorie-segment').evaluateAll((segments) => segments.map((segment) => segment.getAttribute('data-macro')).join(','))
  if (layerOrder !== 'fat,carbs,protein') throw new Error(`Неверное наложение дуг: ${layerOrder}`)
  if (await page.getByText('Цвета кольца: белки, углеводы и жиры.', { exact: true }).count()) throw new Error('Пояснение цветов кольца не удалено')
  const flameTransform = await page.locator('.ring-content > svg').evaluate((element) => getComputedStyle(element).transform)
  if (flameTransform !== 'none') throw new Error(`Пламя повернуто вместе с кольцом: ${flameTransform}`)
  const initialAlignment = await page.locator('.balance-card').evaluate((card) => {
    const plus = card.querySelector('.fab-main').getBoundingClientRect()
    const label = card.querySelector('.macro-item > div:first-child').getBoundingClientRect()
    const track = card.querySelector('.macro-item .thin-track').getBoundingClientRect()
    return { plusTop: plus.top, plusBottom: plus.bottom, labelTop: label.top, trackBottom: track.bottom }
  })
  if (Math.abs(initialAlignment.plusTop - initialAlignment.labelTop) > 1 || Math.abs(initialAlignment.plusBottom - initialAlignment.trackBottom) > 1) throw new Error(`Макрошкалы не выровнены по плюсу: ${JSON.stringify(initialAlignment)}`)
  check('Дуги: жиры снизу, углеводы выше, белки сверху; иконки 30%, подпись удалена')

  await page.locator('.empty-nutrients').evaluate((element) => element.click())
  await page.getByRole('button', { name: 'Добавить в избранное: Витамин C' }).evaluate((element) => element.click())
  await page.getByRole('button', { name: 'Добавить в избранное: Магний' }).evaluate((element) => element.click())
  await page.getByRole('button', { name: /Готово · избранных: 2/ }).evaluate((element) => element.click())
  await page.locator('.sheet-backdrop').waitFor({ state: 'detached' })
  if (await page.locator('.micro-grid .micro-card').count() !== 2) throw new Error('Избранные нутриенты не появились')
  const microLabels = await page.locator('.micro-grid .micro-symbol').allTextContents()
  if (microLabels.join(',') !== 'C,Mg') throw new Error(`Нутриенты не используют короткие символы: ${microLabels.join(',')}`)
  await page.locator('.micro-card').filter({ hasText: 'Витамин C' }).evaluate((element) => element.click())
  await page.locator('.nutrient-choice.focused[data-nutrient="vitaminC"]').waitFor()
  await page.getByRole('button', { name: /Готово · избранных: 2/ }).evaluate((element) => element.click())
  await page.locator('.sheet-backdrop').waitFor({ state: 'detached' })
  check('Выбор нутриентов, карточки на главной и открытие выбранного показателя')

  if (await page.locator('.welcome-row .round-add').count()) throw new Error('Верхняя кнопка плюс не удалена')
  await page.evaluate(() => window.scrollTo(0, 0))
  const closedCardHeight = await page.locator('.balance-card').evaluate((element) => element.getBoundingClientRect().height)
  const closedGeometry = await page.locator('.balance-card').evaluate((card) => {
    const ring = card.querySelector('.progress-ring').getBoundingClientRect()
    const macros = card.querySelector('.macro-grid').getBoundingClientRect()
    const track = card.querySelector('.macro-item .thin-track').getBoundingClientRect()
    return { ringWidth: ring.width, macrosX: macros.x, macrosY: macros.y, trackWidth: track.width, trackHeight: track.height,
      labelFont: getComputedStyle(card.querySelector('.macro-item span')).fontSize,
      numberFont: getComputedStyle(card.querySelector('.macro-item strong')).fontSize,
      goalFont: getComputedStyle(card.querySelector('.macro-item strong small')).fontSize }
  })
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  const flameAnimation = await page.locator('.flame-easter-egg').evaluate((element) => getComputedStyle(element).animationName)
  if (flameAnimation !== 'flame-ignite') throw new Error(`Пасхалка пламени не запустилась: ${flameAnimation}`)
  await page.getByRole('button', { name: 'Камера', exact: true }).click()
  await page.getByRole('button', { name: 'Выбрать из галереи' }).waitFor()
  await page.waitForTimeout(350)
  if (await page.locator('.quick-fab').evaluate((element) => getComputedStyle(element).position) === 'fixed') throw new Error('Кнопки всё ещё плавают поверх экрана')
  const galleryBox = await page.getByRole('button', { name: 'Выбрать из галереи' }).boundingBox()
  const cameraBox = await page.getByRole('button', { name: 'Камера', exact: true }).boundingBox()
  const openGeometry = await page.locator('.balance-card').evaluate((card) => {
    const ring = card.querySelector('.progress-ring').getBoundingClientRect()
    const macros = card.querySelector('.macro-grid').getBoundingClientRect()
    const plus = card.querySelector('.fab-main').getBoundingClientRect()
    const label = card.querySelector('.macro-item > div:first-child').getBoundingClientRect()
    const track = card.querySelector('.macro-item .thin-track').getBoundingClientRect()
    return { height: card.getBoundingClientRect().height, ringWidth: ring.width, macrosX: macros.x, macrosY: macros.y, plusTop: plus.top, plusBottom: plus.bottom, labelTop: label.top, trackBottom: track.bottom, trackWidth: track.width, trackHeight: track.height,
      labelFont: getComputedStyle(card.querySelector('.macro-item span')).fontSize,
      numberFont: getComputedStyle(card.querySelector('.macro-item strong')).fontSize,
      goalFont: getComputedStyle(card.querySelector('.macro-item strong small')).fontSize }
  })
  if (!galleryBox || !cameraBox || galleryBox.x + galleryBox.width > cameraBox.x || Math.abs(galleryBox.y - cameraBox.y) > 1) throw new Error('Галерея не находится слева от камеры в одной строке')
  if (Math.abs(openGeometry.height - closedCardHeight) > 1) throw new Error(`Карточка меняет высоту: ${closedCardHeight} → ${openGeometry.height}`)
  if (openGeometry.ringWidth >= closedGeometry.ringWidth) throw new Error(`Кольцо не уменьшилось: ${closedGeometry.ringWidth} → ${openGeometry.ringWidth}`)
  if (openGeometry.macrosX >= closedGeometry.macrosX || Math.abs(openGeometry.macrosY - closedGeometry.macrosY) > 1) throw new Error(`Макрошкалы сдвинулись не только влево: ${JSON.stringify({ closedGeometry, openGeometry })}`)
  if (openGeometry.labelFont !== closedGeometry.labelFont || openGeometry.numberFont !== closedGeometry.numberFont || openGeometry.goalFont !== closedGeometry.goalFont) throw new Error(`Размер шрифта БЖУ изменился: ${JSON.stringify({ closedGeometry, openGeometry })}`)
  if (openGeometry.trackWidth >= closedGeometry.trackWidth || openGeometry.trackHeight !== closedGeometry.trackHeight) throw new Error(`Шкала изменилась не только по ширине: ${JSON.stringify({ closedGeometry, openGeometry })}`)
  if (Math.abs(openGeometry.plusTop - openGeometry.labelTop) > 1 || Math.abs(openGeometry.plusBottom - openGeometry.trackBottom) > 1) throw new Error(`Раскрытые макрошкалы не выровнены по плюсу: ${JSON.stringify(openGeometry)}`)
  await page.screenshot({ path: path.join(artifacts, 'actions-open.png'), fullPage: true })
  await page.getByRole('heading', { name: 'Твой баланс' }).click()
  await expect(page.locator('.quick-fab')).not.toHaveClass(/open/)
  check('Пасхалка пламени, галерея слева, меньшее кольцо и шкалы влево без сдвига по высоте')

  await page.evaluate(() => {
    const originalClick = HTMLInputElement.prototype.click
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') { window.__photoPicker = this.getAttribute('aria-label'); return }
      originalClick.call(this)
    }
  })
  await tap(page.getByRole('button', { name: 'Быстро добавить еду' }), false)
  await tap(page.getByRole('button', { name: 'Камера', exact: true }), false)
  await tap(page.getByRole('button', { name: 'Выбрать из галереи' }), false)
  if (await page.evaluate(() => window.__photoPicker) !== 'Фото еды или отчёт InBody из галереи') throw new Error('Галерея вызывает неправильное файловое поле')
  if (await page.getByLabel('Фото еды или отчёт InBody из галереи').getAttribute('capture') !== null) throw new Error('Галерея ошибочно запрашивает камеру')
  await page.getByRole('button', { name: 'Закрыть' }).click()

  await page.evaluate(() => { window.__photoPicker = '' })
  await tap(page.getByRole('button', { name: 'Быстро добавить еду' }), false)
  await tap(page.getByRole('button', { name: 'Камера', exact: true }), false)
  await tap(page.getByRole('button', { name: 'Камера', exact: true }), false)
  await page.getByRole('alertdialog').filter({ hasText: 'Еда на фото должна быть хорошо видна' }).waitFor()
  if (await page.evaluate(() => window.__photoPicker)) throw new Error('Камера открылась до подтверждения совета')
  await page.getByRole('button', { name: 'Открыть камеру', exact: true }).click()
  if (await page.evaluate(() => window.__photoPicker) !== 'Снимок с камеры') throw new Error('Подтверждение совета вызывает неправильное файловое поле')
  if (await page.getByLabel('Снимок с камеры').getAttribute('capture') !== 'environment') throw new Error('Камера не запрашивает снимок задней камерой')
  if (await page.evaluate(() => localStorage.getItem('norma-camera-openings')) !== '1') throw new Error('Число обучающих запусков камеры не сохранено')
  await page.getByRole('button', { name: 'Закрыть' }).click()
  check('Галерея и камера вызывают правильные поля, первые пять запусков требуют подтверждение')

  await tap(page.getByRole('button', { name: 'Быстро добавить еду' }), false)
  await page.evaluate(() => window.scrollBy(0, 160))
  await expect(page.locator('.quick-fab')).not.toHaveClass(/open/)
  await page.evaluate(() => window.scrollTo(0, 0))
  check('Быстрые действия сворачиваются при прокрутке')

  await page.locator('.bottom-nav').getByRole('button', { name: 'Питание' }).click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('творог')
  const cottage = page.locator('.product-row').filter({ hasText: 'Творог 5%' })
  await cottage.locator('.product-main').click()
  const portion = page.getByLabel('Порция, граммы')
  await portion.fill('')
  if (await portion.inputValue() !== '') throw new Error('Поле массы нельзя полностью стереть')
  await page.locator('.sheet-heading h2').click()
  await expect(portion).toHaveValue('0')
  if (!(await page.getByRole('button', { name: 'Добавить в обед' }).isDisabled())) throw new Error('Нулевая порция доступна к добавлению')
  await portion.fill('200')
  if (await page.locator('.full-profile').count()) throw new Error('В окне порции остался лишний полный профиль')
  check('Масса стирается полностью, получает 0 после blur и не допускает нулевую порцию')

  await page.getByRole('button', { name: 'О продукте' }).click()
  await page.locator('.product-description').getByText('Классический, 5% жирности', { exact: true }).waitFor()
  await expect(page.getByText('Описание и состав на 100 г', { exact: true })).toBeVisible()
  await expect(page.locator('.product-page-macros > div')).toHaveCount(4)
  await page.locator('.product-page .nutrient-profile-row').first().waitFor()
  const percentages = await page.locator('.product-page .nutrient-profile-row > div:first-child b').allTextContents()
  const numbers = percentages.map((text) => Number.parseInt(text)).filter((value) => !Number.isNaN(value))
  if (!numbers.length || numbers.some((value, index) => index && value > numbers[index - 1])) throw new Error('Нутриенты на 100 г не отсортированы')
  await page.getByRole('button', { name: 'Вернуться к порции' }).click()
  await page.getByRole('button', { name: 'Добавить в обед' }).click()
  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await tap(page.getByRole('button', { name: 'Изменить Творог 5%' }))
  await page.getByLabel('Порция, граммы').fill('180')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await page.getByRole('button', { name: 'Изменить Творог 5%' }).waitFor()
  if (await page.getByRole('button', { name: 'Изменить Творог 5%' }).count() !== 1) throw new Error('При редактировании создан дубликат')
  await expect(page.getByRole('button', { name: 'Изменить Творог 5%' }), 'Новая масса не сохранена').toContainText('180')
  check('Страница продукта и изменение существующей порции без дубликата')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await page.getByRole('button', { name: 'Открыть каталог' }).click()
  await page.getByPlaceholder('Гречка, творог, банан…').fill('йогурт')
  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await page.getByRole('button', { name: 'Открыть каталог' }).click()
  if (await page.getByPlaceholder('Гречка, творог, банан…').inputValue() !== '') throw new Error('Поиск не очищен при переходе через плюс')
  if (await page.locator('.food-source-actions, .camera-button').count()) throw new Error('В каталоге остались фото или штрихкод')
  check('Повторный плюс открывает каталог, очищает поиск и не дублирует фото/сканер')

  await page.getByRole('button', { name: 'Личный профиль' }).click()
  for (const label of ['Год рождения', 'Вес, кг', 'Рост, см']) {
    const input = page.getByLabel(label, { exact: true })
    await input.fill('')
    await page.locator('.sheet-heading h2').click()
    await expect(input, `${label}: пустое значение не стало 0`).toHaveValue('0')
  }
  if (!(await page.getByRole('button', { name: 'Сохранить профиль' }).isDisabled())) throw new Error('Пустой профиль можно сохранить')
  await page.getByRole('button', { name: 'Закрыть' }).click()
  check('Год, вес и рост допускают полное стирание и получают 0 после blur')

  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await tap(page.getByRole('button', { name: 'Сканировать штрихкод' }), false)
  await page.waitForFunction(() => window.__cameraRequested === true)
  if (await page.getByRole('button', { name: 'Включить сканер' }).count()) throw new Error('Сканер требует отдельного включения')
  check('Сканер сразу запрашивает камеру без промежуточной кнопки')
  await page.screenshot({ path: path.join(artifacts, 'barcode-auto.png'), fullPage: true })
  await page.getByRole('button', { name: 'Закрыть' }).click()
  await page.screenshot({ path: path.join(artifacts, 'dashboard.png'), fullPage: true })

  await page.locator('.bottom-nav').getByRole('button', { name: 'Помощник' }).click()
  await page.getByRole('button', { name: 'Еда и тренировка' }).click()
  await page.getByRole('alert').filter({ hasText: 'Помощник временно недоступен' }).waitFor()
  if (await page.getByText(/До тренировки осталось добрать/).count()) throw new Error('При ошибке чата показан локальный подменный ответ')
  if (await page.locator('.chat-message.user').count() !== 1) throw new Error('Вопрос пользователя не сохранился после ошибки')
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await page.getByText(/Реальный проверочный ответ API/).waitFor()
  if (await page.locator('.chat-message.user').count() !== 1) throw new Error('Повтор продублировал вопрос пользователя')
  check('Ошибка чата не подменяется демо, повтор не дублирует вопрос')

  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')].map((element) => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.right > document.documentElement.clientWidth + 1 || rect.left < -1).slice(0, 20).map(({ element, rect }) => ({ tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width })),
  }))
  if (overflow.scrollWidth > overflow.width) throw new Error(`Horizontal overflow detected: ${JSON.stringify(overflow)}`)
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  console.log(`\n${checks.length} новых сценариев взаимодействия успешно проверено.`)
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
