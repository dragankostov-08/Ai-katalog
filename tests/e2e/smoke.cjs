// End-to-end smoke test against a running local stack:
//   npm run local:db -- --publish-seed && npm run local:api   (terminal 1)
//   npm run build && npm run preview                           (terminal 2)
//   node tests/e2e/smoke.cjs                                   (terminal 3)
// Uses the Playwright package available in the environment (require('playwright')).
// It writes test data (a suggestion, a message, a newsletter entry, a verified tool):
// run it only against the throwaway local database.
const { chromium } = require('playwright')

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'
let failures = 0

async function step(name, fn) {
  try {
    await fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    failures++
    console.log(`FAIL - ${name}\n    ${String(error.message).split('\n')[0]}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  context.setDefaultTimeout(8000)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await step('consent banner can be dismissed and reopened from the footer', async () => {
    await page.goto(BASE + '/')
    const banner = page.getByRole('region', { name: 'Приватност и колачиња' })
    await banner.waitFor()
    await banner.getByRole('button', { name: 'Само неопходни' }).click()
    await banner.waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Поставки за приватност' }).click()
    await page.getByRole('dialog', { name: 'Поставки за приватност' }).waitFor()
    await page.getByRole('switch', { name: 'Збирна статистика' }).check()
    await page.getByRole('button', { name: 'Зачувај избор' }).click()
    const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('aik-consent')))
    assert(consent.decided && consent.analytics && !consent.advertising, 'consent not stored as chosen')
  })

  await step('hero search leads to directory results', async () => {
    await page.goto(BASE + '/')
    await page.getByLabel('Пребарај по име, задача или категорија').fill('превод')
    await page.getByRole('button', { name: 'Пребарај', exact: true }).click()
    await page.waitForURL(/\/alatki\?q=/)
    await page.getByRole('link', { name: 'DeepL' }).first().waitFor()
  })

  await step('directory filters update the URL, show chips and can be removed', async () => {
    await page.goto(BASE + '/alatki')
    await page.getByRole('checkbox', { name: 'Отворен код' }).check()
    await page.waitForURL(/cena=open_source/)
    await page.getByRole('link', { name: 'Whisper' }).waitFor()
    await page.getByText(/^1 резултат$/).waitFor()
    await page.getByRole('button', { name: 'Отстрани филтер: Отворен код' }).click()
    await page.waitForURL((url) => !url.search.includes('cena'))
  })

  await step('a filtered URL loaded directly shows filtered results (no stale pre-render)', async () => {
    await page.goto(BASE + '/alatki?cena=open_source')
    await page.getByText(/^1 резултат$/).waitFor()
  })

  await step('empty search shows a helpful empty state', async () => {
    await page.goto(BASE + '/alatki?q=zzzxxyy')
    await page.getByRole('heading', { name: 'Нема алатки што одговараат' }).waitFor()
  })

  await step('tool can be saved to favorites and appears on /omileni', async () => {
    await page.goto(BASE + '/alatka/claude')
    await page.getByRole('button', { name: 'Зачувај', exact: true }).click()
    await page.getByRole('link', { name: /Омилени \(1\)/ }).click()
    await page.waitForURL(/\/omileni/)
    await page.getByRole('heading', { name: 'Омилени алатки' }).waitFor()
    await page.getByRole('main').getByRole('link', { name: 'Claude', exact: true }).waitFor()
  })

  await step('wizard walks through five questions and explains the results', async () => {
    await page.goto(BASE + '/pronajdi')
    await page.getByLabel('Да преведам текст').check()
    await page.getByRole('button', { name: 'Следно' }).click()
    await page.getByLabel(/^Почетник/).check()
    await page.getByRole('button', { name: 'Следно' }).click()
    await page.getByLabel(/Да, мора да биде бесплатна/).check()
    await page.getByRole('button', { name: 'Следно' }).click()
    await page.getByRole('button', { name: 'Следно' }).click()
    await page.getByLabel(/^Не е важно/).check()
    await page.getByRole('button', { name: 'Прикажи препораки' }).click()
    await page.waitForURL(/zadaca=prevod/)
    await page.getByRole('heading', { name: /Да преведам текст/ }).waitFor()
    await page.getByText('Наменета е за задачата што ја избра.').first().waitFor()
  })

  await step('tool suggestion form validates, then submits to moderation', async () => {
    await page.goto(BASE + '/predlozi')
    await page.getByRole('button', { name: 'Испрати предлог' }).click()
    await page.getByText('Внеси име од 2 до 120 знаци.').waitFor()
    await page.getByLabel(/Име на алатката/).fill('Тест алатка E2E')
    await page.getByLabel(/Официјална веб-страница/).fill(`https://e2e-${Date.now()}.example.com`)
    await page.waitForTimeout(2600)
    await page.getByRole('button', { name: 'Испрати предлог' }).click()
    await page.getByText('Предлогот е примен и чека преглед од уредник.').waitFor()
  })

  await step('contact form submits', async () => {
    await page.goto(BASE + '/kontakt?tema=correction')
    await page.getByLabel(/^Име/).fill('Тестер')
    await page.getByLabel(/^Е-пошта/).fill('tester@example.com')
    await page.getByLabel(/^Порака/).fill('Ова е тест порака за корекција.')
    await page.waitForTimeout(2600)
    await page.getByRole('button', { name: 'Испрати порака' }).click()
    await page.getByText('Пораката е испратена.').waitFor()
  })

  await step('newsletter requires consent, subscribes and unsubscribes with the token', async () => {
    await page.goto(BASE + '/')
    await page.locator('#newsletter-email').fill(`e2e-${Date.now()}@example.com`)
    await page.getByRole('button', { name: 'Пријави се' }).click()
    await page.getByText('За пријава е потребна твоја согласност.').waitFor()
    await page.getByRole('checkbox', { name: /Се согласувам/ }).check()
    await page.getByRole('button', { name: 'Пријави се' }).click()
    await page.getByRole('link', { name: 'овој линк' }).click()
    await page.getByRole('button', { name: 'Потврди одјава' }).click()
    await page.getByText('Одјавен/а си.').waitFor()
  })

  await step('unknown pages render the 404 view with noindex', async () => {
    await page.goto(BASE + '/alatka/ne-postoi-takva')
    await page.getByRole('heading', { name: 'Оваа страница ја нема во каталогот.' }).waitFor()
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    assert(robots.includes('noindex'), `robots was ${robots}`)
  })

  await step('mobile navigation dialog opens and closes with Escape', async () => {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await mobile.goto(BASE + '/')
    await mobile.getByRole('button', { name: 'Мени' }).click()
    const dialog = mobile.getByRole('dialog', { name: 'Мени' })
    await dialog.waitFor()
    await mobile.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await mobile.close()
  })

  await step('admin rejects wrong credentials', async () => {
    await page.goto(BASE + '/admin')
    await page.getByLabel('Е-пошта').fill('editor@local.test')
    await page.getByLabel('Лозинка').fill('wrong')
    await page.getByRole('button', { name: 'Најави се' }).click()
    await page.getByText('Погрешна е-пошта или лозинка.').waitFor()
  })

  await step('editor edits and verifies a tool; the public page reflects it', async () => {
    await page.getByLabel('Лозинка').fill('local-editor')
    await page.getByRole('button', { name: 'Најави се' }).click()
    await page.getByRole('heading', { name: 'Преглед' }).waitFor()
    assert((await page.getByRole('link', { name: 'Поставки', exact: true }).count()) === 0, 'editor must not see settings')
    await page.getByRole('navigation', { name: 'Администрација' }).getByRole('link', { name: 'Алатки', exact: true }).click()
    await page.getByRole('link', { name: 'Gemini' }).click()
    await page.getByLabel('Почетна цена').fill('0')
    await page.getByLabel('Валута').fill('EUR')
    await page.getByRole('button', { name: 'Зачувај' }).first().click()
    await page.getByText('Алатката е зачувана.').waitFor()
    await page.getByLabel('Белешка (извор, што е проверено)').fill('Проверено на официјалната страница (E2E).')
    await page.getByRole('button', { name: 'Означи проверено' }).click()
    await page.getByText('Алатката е означена како проверена.').waitFor()
    await page.goto(BASE + '/alatka/google-gemini?fresh=1')
    await page.getByText(/Проверено на официјалната страница:/).waitFor()
  })

  await step('publishing incomplete content is blocked with explanations', async () => {
    await page.goto(BASE + '/admin/alatki/nova')
    await page.getByLabel(/^Име/).fill('Нова тест алатка')
    await page.getByLabel('Статус').selectOption('published')
    await page.getByRole('button', { name: 'Зачувај' }).first().click()
    await page.getByText('За објавување е потребна официјална адреса.').waitFor()
  })

  await step('the moderation queue shows the visitor suggestion', async () => {
    await page.goto(BASE + '/admin/predlozi')
    await page.getByText('Тест алатка E2E').first().waitFor()
  })

  await step('no uncaught page errors', async () => {
    assert(errors.length === 0, errors.join(' | '))
  })

  await browser.close()
  console.log(failures ? `\n${failures} step(s) failed` : '\nAll smoke steps passed')
  process.exit(failures ? 1 : 0)
})()
