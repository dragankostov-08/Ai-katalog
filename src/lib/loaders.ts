import { data } from 'react-router'

export function notFound(): never {
  throw data(null, { status: 404 })
}

export function isPreview(request: Request): boolean {
  return new URL(request.url).searchParams.get('preview') === '1'
}

export function searchParamsOf(request: Request): URLSearchParams {
  return new URL(request.url).searchParams
}
