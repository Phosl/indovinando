'use client'

import {getGameAvatar} from '@/lib/avatarUtils'

/**
 * Renders a game avatar (by avatar_id integer).
 * Supports both emoji and SVG img avatars.
 */
export default function AvatarDisplay({avatarId, size = 28, className = ''}) {
  const avatar = getGameAvatar(Number(avatarId))

  if (avatar.type === 'img') {
    return (
      <img
        src={avatar.value}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
        className={className}
      />
    )
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.82),
        lineHeight: 1,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}>
      {avatar.value}
    </span>
  )
}
