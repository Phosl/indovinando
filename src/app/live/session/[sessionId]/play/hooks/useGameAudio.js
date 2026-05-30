import {useState, useEffect, useCallback, useRef} from 'react'
import {haptic} from '@/lib/haptic'

const AUDIO_PREFERENCE_KEY = 'live_audio_enabled'

export function useGameAudio() {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const soundsRef = useRef({correct: null, wrong: null, bottleCompleted: null})
  const primedRef = useRef(false)

  useEffect(() => {
    const savedPreference = localStorage.getItem(AUDIO_PREFERENCE_KEY)
    if (savedPreference === 'off') setAudioEnabled(false)

    soundsRef.current = {
      correct: new Audio('/indovinando-correct.mp3'),
      wrong: new Audio('/indovinando-wrong.mp3'),
      bottleCompleted: new Audio('/indovinando-bottle-completed.mp3'),
    }

    Object.values(soundsRef.current).forEach((audio) => {
      if (!audio) return
      audio.preload = 'auto'
      audio.volume = 0.9
      audio.load()
    })

    // Prime audio after first user interaction to reduce iOS/Safari start latency.
    const primeAudio = () => {
      if (primedRef.current) return
      primedRef.current = true

      Object.values(soundsRef.current).forEach((audio) => {
        if (!audio) return
        const prevMuted = audio.muted
        audio.muted = true
        audio.currentTime = 0
        audio
          .play()
          .then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.muted = prevMuted
          })
          .catch(() => {
            audio.muted = prevMuted
          })
      })
    }

    window.addEventListener('pointerdown', primeAudio, {once: true, passive: true})
    window.addEventListener('keydown', primeAudio, {once: true})

    return () => {
      window.removeEventListener('pointerdown', primeAudio)
      window.removeEventListener('keydown', primeAudio)
    }
  }, [])

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev
      localStorage.setItem(AUDIO_PREFERENCE_KEY, next ? 'on' : 'off')
      return next
    })
  }, [])

  const playSound = useCallback(
    (soundKey) => {
      // Vibrazione indipendente dall'audio
      if (soundKey === 'correct') haptic('correct')
      else if (soundKey === 'wrong') haptic('wrong')
      else if (soundKey === 'bottleCompleted') haptic('success')

      if (!audioEnabled) return
      const sound = soundsRef.current[soundKey]
      if (!sound) return
      sound.currentTime = 0
      sound.play().catch(() => {})
    },
    [audioEnabled],
  )

  return {audioEnabled, toggleAudio, playSound}
}
