import { Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { slugify } from '../../lib/slug'
import { getSupabase } from '../../lib/supabase'
import { controlClass, useToast } from './ui'

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif']

/** Uploads to the public `media` bucket (staff-only writes) or accepts an https URL. */
export function ImageUpload({ label, value, onChange, folder, name, hint }: { label: string; value: string; onChange: (url: string) => void; folder: string; name: string; hint?: string }) {
  const id = useId()
  const toast = useToast()
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) {
      toast('error', 'Дозволени се PNG, JPEG, WebP, SVG и AVIF слики.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast('error', 'Сликата е поголема од 2 MB.')
      return
    }
    setUploading(true)
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `${folder}/${slugify(name) || 'slika'}-${Date.now()}.${extension}`
    const storage = getSupabase().storage.from('media')
    const { error } = await storage.upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
    setUploading(false)
    if (error) {
      toast('error', `Прикачувањето не успеа: ${error.message}`)
      return
    }
    onChange(storage.getPublicUrl(path).data.publicUrl)
    toast('success', 'Сликата е прикачена. Не заборавај да зачуваш.')
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-3">
        {value ? <img src={value} alt="" className="h-10 w-10 shrink-0 border border-ink/30 bg-white object-contain p-0.5" /> : null}
        <input id={id} type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" className={controlClass} />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-ink px-3 text-sm hover:bg-cream">
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? 'Се прикачува…' : 'Прикачи'}
          <input
            type="file"
            accept={TYPES.join(',')}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) upload(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>
      {hint ? <p className="mt-1 text-xs text-graphite">{hint}</p> : null}
    </div>
  )
}
