import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { PRICING_FILTERS, type DirectoryFilters } from '../../lib/directory'
import { platformLabels, pricingLabels } from '../../lib/labels'
import { PLATFORMS, type CategorySummary, type PricingType, type UseCase } from '../../lib/types'

const selectClasses =
  'block w-full rounded-xs border border-ink/40 bg-white px-2.5 py-2 text-sm focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-tomato'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-ink/20 pt-3 pb-5">
      <legend className="float-left mb-2 w-full label-mono text-graphite">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

interface PanelProps {
  filters: DirectoryFilters
  categories: CategorySummary[]
  useCases: UseCase[]
  onChange: (patch: Partial<DirectoryFilters>) => void
  hideCategory?: boolean
}

export function FilterPanel({ filters, categories, useCases, onChange, hideCategory }: PanelProps) {
  const togglePricing = (value: PricingType) =>
    onChange({ cena: filters.cena.includes(value) ? filters.cena.filter((v) => v !== value) : [...filters.cena, value] })

  return (
    <div>
      {!hideCategory ? (
        <Group title="Категорија">
          <label htmlFor="filter-category" className="sr-only">
            Категорија
          </label>
          <select id="filter-category" className={selectClasses} value={filters.kategorija} onChange={(e) => onChange({ kategorija: e.target.value })}>
            <option value="">Сите категории</option>
            {categories
              .filter((c) => c.tool_count > 0 || c.slug === filters.kategorija)
              .map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name} ({category.tool_count})
                </option>
              ))}
          </select>
        </Group>
      ) : null}

      <Group title="Намена">
        <label htmlFor="filter-use-case" className="sr-only">
          Намена
        </label>
        <select id="filter-use-case" className={selectClasses} value={filters.namena} onChange={(e) => onChange({ namena: e.target.value })}>
          <option value="">Сите намени</option>
          {useCases.map((useCase) => (
            <option key={useCase.slug} value={useCase.slug}>
              {useCase.name}
            </option>
          ))}
        </select>
      </Group>

      <Group title="Модел на плаќање">
        <ul className="space-y-1.5">
          {PRICING_FILTERS.map((value) => (
            <li key={value}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={filters.cena.includes(value)} onChange={() => togglePricing(value)} />
                {pricingLabels[value]}
              </label>
            </li>
          ))}
        </ul>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 border-t border-dashed border-ink/20 pt-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-ink" checked={filters.besplatno} onChange={(e) => onChange({ besplatno: e.target.checked })} />
          Има потврден бесплатен план
        </label>
      </Group>

      <Group title="Платформа">
        <label htmlFor="filter-platform" className="sr-only">
          Платформа
        </label>
        <select id="filter-platform" className={selectClasses} value={filters.platforma} onChange={(e) => onChange({ platforma: e.target.value })}>
          <option value="">Сите платформи</option>
          {PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabels[platform]}
            </option>
          ))}
        </select>
      </Group>
    </div>
  )
}

export function ActiveFilterChips({ filters, categories, useCases, onChange, onClear, hideCategory }: PanelProps & { onClear: () => void }) {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (filters.q) chips.push({ key: 'q', label: `„${filters.q}“`, remove: () => onChange({ q: '' }) })
  if (filters.kategorija && !hideCategory) {
    const category = categories.find((c) => c.slug === filters.kategorija)
    chips.push({ key: 'cat', label: category?.name ?? filters.kategorija, remove: () => onChange({ kategorija: '' }) })
  }
  if (filters.namena) {
    const useCase = useCases.find((u) => u.slug === filters.namena)
    chips.push({ key: 'use', label: useCase?.name ?? filters.namena, remove: () => onChange({ namena: '' }) })
  }
  filters.cena.forEach((value) =>
    chips.push({ key: `p-${value}`, label: pricingLabels[value], remove: () => onChange({ cena: filters.cena.filter((v) => v !== value) }) }),
  )
  if (filters.besplatno) chips.push({ key: 'free', label: 'Бесплатен план', remove: () => onChange({ besplatno: false }) })
  if (filters.platforma) {
    chips.push({
      key: 'platform',
      label: platformLabels[filters.platforma as keyof typeof platformLabels] ?? filters.platforma,
      remove: () => onChange({ platforma: '' }),
    })
  }
  if (!chips.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Активни филтри">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="inline-flex items-center gap-1.5 rounded-xs border border-ink bg-ink py-1 pr-1.5 pl-2.5 text-sm text-paper hover:bg-graphite"
          aria-label={`Отстрани филтер: ${chip.label}`}
        >
          {chip.label}
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onClear} className="px-1 text-sm underline underline-offset-2 hover:text-tomato-ink">
        Исчисти сè
      </button>
    </div>
  )
}
