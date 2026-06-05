export function scrollPageTop(behavior = 'auto') {
  if (typeof window === 'undefined') return

  const run = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior,
    })
  }

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run)
    return
  }

  run()
}
