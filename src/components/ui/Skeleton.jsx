const SURFACE_CLASS_NAMES = {
  card: 'skeleton-card',
  frame: 'skeleton-frame',
}

export function SkeletonBone({
  as: Component = 'span',
  className = '',
  style,
  ...props
}) {
  return (
    <Component
      {...props}
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

export function SkeletonSurface({
  as: Component = 'div',
  variant = 'card',
  className = '',
  children,
  ...props
}) {
  const surfaceClassName = SURFACE_CLASS_NAMES[variant] || SURFACE_CLASS_NAMES.card

  return (
    <Component
      {...props}
      aria-hidden="true"
      className={`${surfaceClassName} ${className}`.trim()}>
      {children}
    </Component>
  )
}

export function SkeletonCard(props) {
  return <SkeletonSurface {...props} variant="card" />
}

export function SkeletonFrame(props) {
  return <SkeletonSurface {...props} variant="frame" />
}
