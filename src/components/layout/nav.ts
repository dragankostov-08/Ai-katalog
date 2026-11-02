export const primaryNav = [
  { to: '/alatki', label: 'Алатки' },
  { to: '/promptovi', label: 'Промптови' },
  { to: '/sporedbi', label: 'Споредби' },
  { to: '/vodici', label: 'Водичи' },
  { to: '/najdobri', label: 'Најдобри' },
  { to: '/patki', label: 'Учи' },
] as const

export const footerNav = [
  {
    title: 'Каталог',
    links: [
      { to: '/alatki', label: 'Сите алатки' },
      { to: '/kategorii', label: 'Категории' },
      { to: '/alternativi', label: 'Бесплатни алтернативи' },
      { to: '/sporedi', label: 'Спореди алатки' },
      { to: '/pronajdi', label: 'Пронајди алатка' },
      { to: '/predlozi', label: 'Предложи алатка' },
      { to: '/omileni', label: 'Омилени' },
    ],
  },
  {
    title: 'Содржина',
    links: [
      { to: '/promptovi', label: 'Промптови' },
      { to: '/vodici', label: 'Водичи' },
      { to: '/sporedbi', label: 'Споредби' },
      { to: '/najdobri', label: 'Најдобри листи' },
      { to: '/testirano-na-makedonski', label: 'Тестирано на македонски' },
    ],
  },
  {
    title: 'Учи',
    links: [
      { to: '/patki', label: 'Патеки за учење' },
      { to: '/recnik', label: 'AI речник' },
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
