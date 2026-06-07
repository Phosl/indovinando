'use client'

import {useMemo, useState} from 'react'

const COVER_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'svg']
const FALLBACK_IMAGE_SRC = '/corsi/cover_corso.png'

export default function CourseLevelCover({
  levelOrder,
  title,
  emoji,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  overlayClassName = '',
}) {
  const sources = useMemo(
    () =>
      [
        ...COVER_EXTENSIONS.map(
          (extension) => `/corsi/cover_corsi/corso_livello_${levelOrder}.${extension}`,
        ),
        FALLBACK_IMAGE_SRC,
      ],
    [levelOrder],
  )
  const [sourceIndex, setSourceIndex] = useState(0)
  const [showFallback, setShowFallback] = useState(false)

  if (showFallback || !sources[sourceIndex]) {
    return <div className={fallbackClassName}>{emoji}</div>
  }

  return (
    <div className={className}>
      <img
        src={sources[sourceIndex]}
        alt={title}
        className={imageClassName}
        onError={() => {
          if (sourceIndex < sources.length - 1) {
            setSourceIndex(sourceIndex + 1)
            return
          }

          setShowFallback(true)
        }}
      />
      {overlayClassName ? <div className={overlayClassName} aria-hidden="true" /> : null}
    </div>
  )
}
