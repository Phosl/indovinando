import Link from 'next/link'

function buildButtonClassName({
  variant = 'neutral',
  size = 'base',
  textOnly = false,
  className = '',
}) {
  const classes = ['btn']
  if (variant) classes.push(variant)
  if (size === 'small') classes.push('btn-small')
  if (size === 'mini') classes.push('btn-mini')
  if (textOnly) classes.push('btn-only-text')
  if (className) classes.push(className)
  return classes.join(' ')
}

export function Button({
  children,
  variant = 'neutral',
  size = 'base',
  textOnly = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={buildButtonClassName({variant, size, textOnly, className})}
      type="button"
      {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  children,
  href,
  variant = 'neutral',
  size = 'base',
  textOnly = false,
  className = '',
  ...props
}) {
  return (
    <Link
      href={href}
      className={buildButtonClassName({variant, size, textOnly, className})}
      {...props}>
      {children}
    </Link>
  )
}

