/**
 * Haptic feedback utilities using Web Vibration API.
 * Works on Android (Chrome) and iOS 13+ PWA.
 */

export function haptic(type = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  switch (type) {
    case 'light':
      navigator.vibrate(10)
      break
    case 'medium':
      navigator.vibrate(30)
      break
    case 'heavy':
      navigator.vibrate(60)
      break
    case 'correct':
      navigator.vibrate([10, 50, 10]) // doppio tap leggero
      break
    case 'wrong':
      navigator.vibrate([80, 40, 80]) // vibrazione forte doppia
      break
    case 'combo':
      navigator.vibrate([10, 30, 10, 30, 20]) // triplo tap
      break
    case 'success':
      navigator.vibrate([20, 40, 20, 40, 60]) // salita crescente
      break
    default:
      navigator.vibrate(20)
  }
}
