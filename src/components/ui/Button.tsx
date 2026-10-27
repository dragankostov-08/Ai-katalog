import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-sm transition-[transform,box-shadow,background-color,color] duration-200 ease-[var(--ease-editorial)] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-tomato)] active:translate-x-0 active:translate-y-0 active:shadow-none',
  secondary: 'border border-ink text-ink bg-transparent hover:bg-ink hover:text-paper',
  ghost: 'text-ink hover:bg-cream',
  accent: 'bg-mustard text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-sm active:translate-x-0 active:translate-y-0 active:shadow-none',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}
