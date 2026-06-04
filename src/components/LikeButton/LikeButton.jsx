'use client'
import {useState} from 'react'
import './LikeButton.css'

export default function LikeButton({initialCount = 43179}) {
  const [count, setCount] = useState(initialCount)
  const [fillLevel, setFillLevel] = useState(0)
  const [burst, setBurst] = useState(false)
  const [direction, setDirection] = useState({x: 0, y: -1})

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()

    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2

    setDirection({
      x: x / rect.width,
      y: y / rect.height,
    })

    setCount((prev) => prev + 1)

    setFillLevel((prev) => {
      const next = Math.min(prev + 25, 100)

      if (next === 100 && prev < 100) {
        setBurst(false)
        requestAnimationFrame(() => setBurst(true))
      }

      return next
    })
  }

  const confetti = Array.from({length: 18})

  return (
    <div className="likeButtonWrap">
      <button
        className={`likeButton ${burst ? 'has-burst' : ''}`}
        onClick={handleClick}
        style={{
          '--jump-x': `${direction.x * 18}px`,
          '--jump-y': `${direction.y * 18}px`,
        }}
        aria-label="Like this post">
        <span className="confettiLayer">
          {confetti.map((_, index) => (
            <span
              key={index}
              className="confetto"
              style={{
                '--angle': `${index * 20}deg`,
                '--distance': `${28 + (index % 5) * 8}px`,
              }}
            />
          ))}
        </span>

        <svg className="heartSvg" viewBox="0 0 50 42">
          <defs>
            <linearGradient id="emptyGradient" x1="0" y1="42" x2="50" y2="0">
              <stop stopColor="#555" />
              <stop offset="1" stopColor="#888" />
            </linearGradient>

            <linearGradient id="activeGradient" x1="25" y1="42" x2="25" y2="0">
              <stop stopColor="hsl(353, 100%, 52%)" />
              <stop offset="1" stopColor="hsl(313, 100%, 52%)" />
            </linearGradient>

            <clipPath id="heartClip">
              <path d="M13.25 0.03C23.4 0.03 25 10.5 25 10.5S26.65-.6 37.6.03C44.34.41 48.75 6.32 48.98 12.2C49.79 32.77 28.77 41.5 25.03 41.5C21.29 41.5-.55 32.35 1.07 12.2C1.55 6.32 6.3.03 13.25.03Z" />
            </clipPath>
          </defs>

          <path
            d="M13.25 0.03C23.4 0.03 25 10.5 25 10.5S26.65-.6 37.6.03C44.34.41 48.75 6.32 48.98 12.2C49.79 32.77 28.77 41.5 25.03 41.5C21.29 41.5-.55 32.35 1.07 12.2C1.55 6.32 6.3.03 13.25.03Z"
            fill="url(#emptyGradient)"
          />

          <g clipPath="url(#heartClip)">
            <rect
              className="heartFill"
              x="0"
              y="0"
              width="50"
              height="42"
              fill="url(#activeGradient)"
              style={{
                transform: `translateY(${100 - fillLevel}%)`,
              }}
            />
          </g>

          {fillLevel < 100 ? (
            <g className="neutralFace">
              <circle cx="15" cy="22" r="2" />
              <circle cx="35" cy="22" r="2" />
              <path d="M20 30 Q25 32 30 30" fill="none" strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : (
            <g className="happyFace">
              <path d="M13 23 Q15 19 17 23" fill="none" strokeWidth="2" strokeLinecap="round" />
              <path d="M33 23 Q35 19 37 23" fill="none" strokeWidth="2" strokeLinecap="round" />
              <path d="M19 29 Q25 36 31 29" fill="none" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </button>

      <span className="likeCount">{count.toLocaleString('it-IT')}</span>
    </div>
  )
}
