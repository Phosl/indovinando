export function computeUserLevelProgress(completedLessons, totalLessons, steps = 6) {
  if (!totalLessons) {
    return {
      levelNum: 1,
      nextLevelNum: 2,
      progressInLevel: 0,
      isMax: false,
    }
  }

  const pct = completedLessons / totalLessons
  const levelIdx = Math.min(steps - 1, Math.floor(pct * steps))
  const bandStart = levelIdx / steps
  const progressInLevel =
    levelIdx === steps - 1 && completedLessons === totalLessons
      ? 100
      : Math.round(Math.min(100, Math.max(0, ((pct - bandStart) / (1 / steps)) * 100)))

  const levelNum = levelIdx + 1
  const nextLevelNum = Math.min(steps, levelNum + 1)
  const isMax = levelNum >= steps && progressInLevel >= 100

  return {
    levelNum,
    nextLevelNum,
    progressInLevel,
    isMax,
  }
}
