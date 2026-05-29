import styles from './Icon.module.scss'

const ICON_SIZE_SCALE = [24, 32, 40, 48]

const ICONS = {
  checkCorrect: '/icons/check-correct.svg',
  checkWrong: '/icons/check-wrong.svg',
  checkCorrectWhite: '/icons/check-correct-white.svg',
  checkWrongWhite: '/icons/check-wrong-white.svg',
  checkWarning: '/icons/check-warning.svg',
  removeSmall: '/icons/remove-small.svg',
  edit: '/icons/edit.svg',
  print: '/icons/print.svg',
  share: '/icons/share.svg',
  bottle: '/icons/bottle.svg',
  bottleRed: '/icons/bottle-red.svg',
  bottleWhite: '/icons/bottle-white.svg',
  plus: '/icons/plus.svg',
  plusSimple: '/icons/plus-simple.svg',
  back: '/icons/back.svg',
  forward: '/icons/forward-icon.svg',
  question: '/icons/questions.svg',
}

const ICON_RENDER_MODE = {
  checkCorrect: 'image',
  checkWrong: 'image',
  checkCorrectWhite: 'image',
  checkWrongWhite: 'image',
  checkWarning: 'image',
  removeSmall: 'image',
}

function normalizeIconSize(size) {
  const numericSize = Number(size)
  if (!Number.isFinite(numericSize)) return 24

  return ICON_SIZE_SCALE.reduce((closest, current) =>
    Math.abs(current - numericSize) < Math.abs(closest - numericSize) ? current : closest,
  )
}

export default function Icon({name, src, size = 24, className = '', title = ''}) {
  const iconPath = src || ICONS[name]
  if (!iconPath) return null
  const normalizedSize = normalizeIconSize(size)
  const renderMode = src ? 'mask' : ICON_RENDER_MODE[name] || 'mask'

  if (renderMode === 'image') {
    return (
      <img
        src={iconPath}
        className={className}
        style={{width: normalizedSize, height: normalizedSize}}
        alt={title || ''}
        aria-hidden={title ? undefined : true}
        title={title || undefined}
      />
    )
  }

  return (
    <span
      className={`${styles.icon} ${className}`.trim()}
      style={{
        '--icon-size': `${normalizedSize}px`,
        maskImage: `url(${iconPath})`,
        WebkitMaskImage: `url(${iconPath})`,
      }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      title={title || undefined}
    />
  )
}

export {ICONS}
