import { Link } from 'react-router'

export interface Crumb {
  name: string
  path?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Патека" className="mb-5 overflow-x-auto scrollbar-thin">
      <ol className="flex items-center gap-1.5 font-mono text-xs whitespace-nowrap text-graphite">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden className="text-mid">/</span> : null}
            {item.path && index < items.length - 1 ? (
              <Link to={item.path} className="underline-offset-2 hover:text-ink hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current={index === items.length - 1 ? 'page' : undefined} className="text-ink">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
