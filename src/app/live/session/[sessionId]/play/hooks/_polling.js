export function runVisiblePoll(callback, intervalMs) {
  const pollVisible = () => {
    if (!document.hidden) callback()
  }

  const onVisibilityChange = () => {
    if (!document.hidden) callback()
  }

  const intervalId = setInterval(pollVisible, intervalMs)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

