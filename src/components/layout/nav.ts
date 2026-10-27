export const primaryNav = [
  { to: '/alatki', label: 'Алатки' },
  { to: '/kategorii', label: 'Категории' },
  { to: '/sporedbi', label: 'Споредби' },
  { to: '/vodici', label: 'Водичи' },
  { to: '/najdobri', label: 'Најдобри' },
] as const

export const footerNav = [
  {
    title: 'Каталог',
    links: [
      { to: '/alatki', label: 'Сите алатки' },
      { to: '/kategorii', label: 'Категории' },
      { to: '/pronajdi', label: 'Пронајди алатка' },
      { to: '/predlozi', label: 'Предложи алатка' },
      { to: '/omileni', label: 'Омилени' },
    ],
  },
  {
    title: 'Содржина',
    links: [
      { to: '/vodici', label: 'Водичи' },
      { to: '/sporedbi', label: 'Споредби' },
      { to: '/najdobri', label: 'Најдобри листи' },
      { to: '/metodologija', label: 'Методологија' },
    ],
  },
  {
    title: 'AI KATALOG',
    links: [
      { to: '/za-nas', label: 'За нас' },
      { to: '/kontakt', label: 'Контакт' },
      { to: '/oglasuvanje', label: 'Огласување' },
      { to: '/affiliate-izjava', label: 'Изјава за партнерства' },
    ],
  },
] as const
