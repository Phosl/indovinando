/**
 * Shared avatar utilities for live game and profile.
 *
 * Live game uses avatar_id (integer 1-16):
 *   1-10 → emoji
 *  11-16 → SVG from /public/avatar/
 *
 * Profile uses avatar_emoji (string): emoji char or '/avatar/XX.svg' path.
 */

export const GAME_AVATARS = [
  {id: 1, type: 'emoji', value: '👨‍💼'},
  {id: 2, type: 'emoji', value: '👩‍💼'},
  {id: 3, type: 'emoji', value: '👨‍🎓'},
  {id: 4, type: 'emoji', value: '👩‍🎓'},
  {id: 5, type: 'emoji', value: '👨‍🎨'},
  {id: 6, type: 'emoji', value: '👩‍🎨'},
  {id: 7, type: 'emoji', value: '👨‍🚀'},
  {id: 8, type: 'emoji', value: '👩‍🚀'},
  {id: 9, type: 'emoji', value: '🧑‍🍳'},
  {id: 10, type: 'emoji', value: '👨‍⚕️'},
  {id: 11, type: 'img', value: '/avatar/avatar-01.svg'},
  {id: 12, type: 'img', value: '/avatar/avatar-02.svg'},
  {id: 13, type: 'img', value: '/avatar/avatar-03.svg'},
  {id: 14, type: 'img', value: '/avatar/avatar-04.svg'},
  {id: 15, type: 'img', value: '/avatar/avatar-05.svg'},
  {id: 16, type: 'img', value: '/avatar/avatar-06.svg'},
]

/** Returns the avatar entry by id (1-based), or a fallback. */
export function getGameAvatar(avatarId) {
  return GAME_AVATARS.find((a) => a.id === avatarId) ?? {id: 1, type: 'emoji', value: '👤'}
}

/**
 * Given a profile avatar_emoji string, return the matching game avatar_id.
 * Tries to match SVG path first, then returns 1 as default.
 */
export function profileAvatarToGameId(avatarEmoji) {
  if (!avatarEmoji) return 1
  if (avatarEmoji.startsWith('/avatar/')) {
    const match = GAME_AVATARS.find((a) => a.type === 'img' && a.value === avatarEmoji)
    if (match) return match.id
  }
  return 1
}
