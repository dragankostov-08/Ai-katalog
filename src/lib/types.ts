export type ContentStatus = 'draft' | 'needs_review' | 'published' | 'archived'
export type PricingType = 'free' | 'freemium' | 'paid' | 'free_trial' | 'open_source' | 'unknown'
export type VerificationStatus = 'unverified' | 'verified' | 'needs_update'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type LanguageSupport = 'yes' | 'partial' | 'no' | 'unknown'
export type PricePeriod = 'month' | 'year' | 'one_time' | 'usage'
export type Accent = 'tomato' | 'mustard' | 'teal' | 'raspberry' | 'ink'

export const PLATFORMS = ['web', 'windows', 'macos', 'linux', 'ios', 'android', 'api', 'browser_extension'] as const
export type Platform = (typeof PLATFORMS)[number]

export const CAPABILITIES = [
  'api_access',
  'integrations',
  'team_collaboration',
  'file_upload',
  'export',
  'open_source',
  'offline',
  'commercial_use',
] as const
export type Capability = (typeof CAPABILITIES)[number]

export interface CategoryRef {
  slug: string
  name: string
  accent: Accent | null
  icon?: string | null
}

export interface CategorySummary extends CategoryRef {
  id: string
  description: string
  tool_count: number
}

export interface UseCase {
  id: string
  slug: string
  name: string
  task_label: string
  description: string
}

export interface SiteSettings {
  contact_email?: string
  publisher_name?: string
  publisher_address?: string
  publisher_registration?: string
  editorial_email?: string
  advertising_email?: string
  about_text?: string
}

export interface SiteData {
  settings: SiteSettings
  categories: CategorySummary[]
  use_cases: UseCase[]
}

export interface ToolCard {
  id: string
  slug: string
  name: string
  short_description: string
  logo_url: string | null
  website_url: string | null
  pricing_type: PricingType
  has_free_plan: boolean | null
  starting_price: number | null
  currency: string | null
  price_period: PricePeriod | null
  verification_status: VerificationStatus
  last_verified_at: string | null
  is_featured: boolean
  is_sponsored: boolean
  published_at: string | null
  category: CategoryRef | null
}

export interface Tool {
  id: string
  name: string
  slug: string
  short_description: string
  description: string
  website_url: string | null
  logo_url: string | null
  developer: string | null
  primary_category_id: string | null
  pricing_type: PricingType
  starting_price: number | null
  currency: string | null
  price_period: PricePeriod | null
  has_free_plan: boolean | null
  free_plan_limits: string | null
  pricing_notes: string | null
  platforms: Platform[]
  capabilities: Capability[]
  macedonian_support: LanguageSupport
  skill_level: SkillLevel | null
  best_for: string | null
  pros: string[]
  cons: string[]
  editorial_verdict: string | null
  keywords: string[]
  verification_status: VerificationStatus
  last_verified_at: string | null
  next_review_at: string | null
  status: ContentStatus
  is_featured: boolean
  is_sponsored: boolean
  sponsor_note: string | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ToolFeature {
  id: string
  feature_name: string
  feature_value: string | null
  verified_at: string | null
}

export interface ArticleCard {
  id: string
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  cover_image_alt: string | null
  author_name: string | null
  published_at: string | null
  updated_at: string
  reading_minutes: number
  category: CategoryRef | null
}

export interface ComparisonCard {
  id: string
  slug: string
  title: string
  introduction: string
  published_at: string | null
  updated_at: string
  tools: { slug: string; name: string; logo_url: string | null }[]
}

export interface CollectionCard {
  id: string
  slug: string
  title: string
  description: string
  published_at: string | null
  updated_at: string
  tool_count: number
  tools: { slug: string; name: string; logo_url: string | null }[]
}

export interface ToolVideo {
  id: string
  youtube_id: string
  title: string
  channel_title: string | null
  language: 'mk' | 'regional' | 'en' | 'other'
  duration_seconds: number | null
  note: string | null
  video_published_at: string | null
}

export interface ToolDetailData {
  tool: Tool
  categories: (CategoryRef & { is_primary: boolean })[]
  use_cases: { slug: string; name: string }[]
  features: ToolFeature[]
  related_tools: ToolCard[]
  articles: ArticleCard[]
  comparisons: ComparisonCard[]
  collections: { slug: string; title: string }[]
  videos: ToolVideo[]
}

export interface HomeData {
  tool_count: number
  featured_tools: ToolCard[]
  recent_tools: ToolCard[]
  collections: CollectionCard[]
  articles: ArticleCard[]
  comparisons: ComparisonCard[]
}

export interface SearchResult {
  total: number
  limit: number
  offset: number
  items: ToolCard[]
}

export interface CategoryDetailData {
  category: {
    id: string
    slug: string
    name: string
    description: string
    intro: string
    icon: string | null
    accent: Accent | null
    seo_title: string | null
    seo_description: string | null
    status: ContentStatus
    updated_at: string
  }
  tool_count: number
  articles: ArticleCard[]
  comparisons: ComparisonCard[]
}

export interface ArticleDetailData {
  article: ArticleCard & {
    content: string
    cover_caption: string | null
    seo_title: string | null
    seo_description: string | null
    status: ContentStatus
  }
  tools: ToolCard[]
  related: ArticleCard[]
}

export interface ComparisonCriterion {
  label: string
  values: Record<string, string | null | undefined>
}

export interface ComparisonTool extends ToolCard {
  free_plan_limits: string | null
  platforms: Platform[]
  pricing_notes: string | null
  strengths: string | null
  limitations: string | null
  best_for: string | null
  features: string[]
}

export interface ComparisonDetailData {
  comparison: {
    id: string
    slug: string
    title: string
    introduction: string
    verdict: string
    criteria: ComparisonCriterion[]
    seo_title: string | null
    seo_description: string | null
    status: ContentStatus
    published_at: string | null
    updated_at: string
  }
  tools: ComparisonTool[]
}

export interface CollectionEntry {
  position: number
  editorial_reason: string
  is_sponsored: boolean
  tool: ToolCard & { free_plan_limits: string | null; best_for: string | null }
}

export interface CollectionDetailData {
  collection: {
    id: string
    slug: string
    title: string
    description: string
    intro: string
    methodology: string
    seo_title: string | null
    seo_description: string | null
    status: ContentStatus
    published_at: string | null
    updated_at: string
  }
  entries: CollectionEntry[]
}

export interface WizardTool extends ToolCard {
  free_plan_limits: string | null
  platforms: Platform[]
  capabilities: Capability[]
  macedonian_support: LanguageSupport
  skill_level: SkillLevel | null
  cons: string[]
  use_cases: string[]
  categories: string[]
}

export interface SitemapData {
  tools: { slug: string; updated_at: string }[]
  categories: { slug: string; updated_at: string }[]
  articles: { slug: string; updated_at: string }[]
  comparisons: { slug: string; updated_at: string }[]
  collections: { slug: string; updated_at: string }[]
}

export interface ActionResult {
  ok: boolean
  error?: string
  message?: string
  status?: string
  slug?: string
  token?: string | null
}
