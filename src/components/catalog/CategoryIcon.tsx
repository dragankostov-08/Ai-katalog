import {
  AudioLines,
  Clapperboard,
  CodeXml,
  Folder,
  GraduationCap,
  Image,
  ListChecks,
  Megaphone,
  PenLine,
  Presentation,
  Search,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/** Icons that editors can assign to categories (by lucide name). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'pen-line': PenLine,
  image: Image,
  clapperboard: Clapperboard,
  'audio-lines': AudioLines,
  'code-xml': CodeXml,
  'graduation-cap': GraduationCap,
  megaphone: Megaphone,
  'list-checks': ListChecks,
  workflow: Workflow,
  presentation: Presentation,
  search: Search,
  folder: Folder,
}

export function CategoryIcon({ name, className = 'h-4 w-4' }: { name?: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Folder
  return <Icon className={className} aria-hidden strokeWidth={1.75} />
}
