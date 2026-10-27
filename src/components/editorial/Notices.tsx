import { Info } from 'lucide-react'
import { Link } from 'react-router'

export function PriceChangeNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`flex gap-2 text-sm text-graphite ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Функциите и цените на AI алатките често се менуваат. Пред плаќање, провери ги условите на официјалната страница.{' '}
        <Link to="/metodologija" className="underline underline-offset-2 hover:text-ink">
          Како проверуваме
        </Link>
      </span>
    </p>
  )
}

export function SponsoredNotice({ note }: { note?: string | null }) {
  return (
    <div role="note" className="border-l-4 border-raspberry bg-white px-4 py-3 text-sm">
      <p className="label-mono mb-1 text-raspberry">Спонзорирано</p>
      <p className="text-graphite">
        {note || 'Оваа содржина е платено истакнување.'} Плаќањето не влијае на уредничките оценки и препораки.{' '}
        <Link to="/affiliate-izjava" className="underline underline-offset-2">
          Повеќе за тоа
        </Link>
      </p>
    </div>
  )
}

export function PreviewBanner() {
  return (
    <div role="status" className="mb-6 border border-mustard bg-mustard/25 px-4 py-2 text-sm">
      <strong>Преглед:</strong> оваа содржина не е објавена и ја гледаат само уредниците.
    </div>
  )
}
