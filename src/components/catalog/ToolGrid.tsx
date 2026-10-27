import type { ToolCard as ToolCardData } from '../../lib/types'
import { ToolCard } from './ToolCard'

export function ToolGrid({ tools, columns = 3 }: { tools: ToolCardData[]; columns?: 2 | 3 | 4 }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }
  return (
    <ul className={`grid grid-cols-1 gap-4 md:gap-5 ${cols[columns]}`}>
      {tools.map((tool) => (
        <li key={tool.id}>
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  )
}
