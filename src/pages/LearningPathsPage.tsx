import { useLoaderData } from 'react-router'
import { LearningPathCard } from '../components/editorial/LearningPathCard'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchLearningPaths } from '../lib/api'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { LearningPathCard as PathCardData } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchLearningPaths(request.signal)

export const handle: RouteHandle<PathCardData[]> = {
  meta: ({ data }) => ({
    title: 'Патеки за учење AI',
    description: 'Чекор по чекор патеки за учење AI алатки на македонски: читај, гледај, вежбај. Напредокот се чува во твојот прелистувач.',
    path: '/patki',
    noindex: !data?.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Патеки за учење', path: '/patki' }])],
  }),
}

export function Component() {
  const paths = useLoaderData() as PathCardData[]
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Патеки за учење' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Учи</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">Патеки за учење</h1>
        <p className="mt-4 text-lg text-graphite">Кратки чекори по ред: водичи, видеа, промптови и вежби. Без регистрација — напредокот се чува кај тебе.</p>
      </header>
      {paths.length ? (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => (
            <li key={path.id}>
              <LearningPathCard path={path} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Првите патеки наскоро" action={<ButtonLink to="/vodici">Водичи</ButtonLink>}>
          Во меѓувреме почни со водичите.
        </EmptyState>
      )}
    </div>
  )
}
