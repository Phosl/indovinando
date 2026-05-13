import {useState, useEffect, useCallback, useRef} from 'react'
import {haptic} from '@/lib/haptic'

const AUDIO_PREFERENCE_KEY = 'live_audio_enabled'

export function useGameAudio() {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const soundsRef = useRef({correct: null, wrong: null, bottleCompleted: null})

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
    })
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
