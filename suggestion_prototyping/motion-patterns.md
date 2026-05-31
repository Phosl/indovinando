# Motion Library Patterns for Prototypes

Interaction patterns for Claude prototype artifacts. Patterns are shown in two variants where it matters: Motion (default for React JSX artifacts) and React Spring + use-gesture (for HTML artifacts or Claude Code when you need more physicality). Each pattern is structured around the four phases from `micro-interaction-craft.md`: anticipation, preview, commit, resolution.

**Motion (React JSX artifacts):** `import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useVelocity, useReducedMotion } from "framer-motion"`

**React Spring + use-gesture (HTML artifacts / Claude Code):** `import { useSpring, useSprings, animated, useTransition } from "@react-spring/web"` and `import { useDrag } from "@use-gesture/react"`

## Table of Contents

1. [Swipe Deck — Motion](#swipe-deck)
2. [Swipe Deck — React Spring + use-gesture](#swipe-deck-react-spring)
3. [Horizontal Carousel](#horizontal-carousel)
3. [Bottom Sheet](#bottom-sheet)
4. [Tab Shell](#tab-shell)
5. [Card Expand / Detail View](#card-expand)
6. [Accessibility Across All Patterns](#accessibility)

---

## Swipe Deck

The card-swipe pattern where the user drags cards left/right (or up/down) to make choices. Dating apps, onboarding quizzes, food preferences, content curation.

### Anticipation: card stack

Show 2-3 cards stacked behind the active card. Each successive card is offset downward and scaled smaller. This communicates "there's a deck to work through" before the user touches anything.

```jsx
{items.slice(index, index + 3).reverse().map((item, stackPos) => {
  const distFromTop = 2 - stackPos; // 0 = top card, 1 = behind, 2 = further back
  const isTop = distFromTop === 0;

  if (!isTop) {
    return (
      <motion.div
        key={item.id}
        style={{ position: "absolute", width: "100%" }}
        initial={false}
        animate={{
          scale: 1 - distFromTop * 0.04,    // 0.96, 0.92
          y: distFromTop * 10,               // 10px, 20px offset
          opacity: 1 - distFromTop * 0.25,   // 0.75, 0.50
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {/* Card content */}
      </motion.div>
    );
  }

  return <ActiveCard key={item.id} item={item} onSwipe={handleSwipe} />;
})}
```

When the active card exits, React reconciliation promotes the next card. Its spring animates it from stacked position (scale 0.96, y: 10) to active position (scale 1, y: 0). This is the resolution phase happening automatically.

### Preview: reactive directional feedback

The active card tracks the drag and shows what will happen if the user lets go. Everything is proportional, nothing fires independently.

```jsx
function ActiveCard({ item, onSwipe }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-18, 0, 18]);

  // All preview feedback scales with drag distance
  const positiveOpacity = useTransform(x, [0, 50, 130], [0, 0.3, 1]);
  const negativeOpacity = useTransform(x, [-130, -50, 0], [1, 0.3, 0]);
  const positiveTint = useTransform(x, [0, 130], ["rgba(0,200,0,0)", "rgba(0,200,0,0.12)"]);
  const negativeTint = useTransform(x, [-130, 0], ["rgba(200,0,0,0.12)", "rgba(0,0,0,0)"]);

  const handleDragEnd = (_, info) => {
    // Velocity-boosted: a fast flick clears even at short distance
    const effective = Math.abs(info.offset.x) + Math.abs(info.velocity.x) * 0.12;
    if (effective > 100) {
      onSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  return (
    <motion.div
      style={{ x, rotate, position: "absolute", width: "100%", touchAction: "none" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitDir === "right" ? 450 : -450,
        rotate: exitDir === "right" ? 22 : -22,
        opacity: 0,
        transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* Directional color tint over the card */}
      <motion.div style={{
        background: positiveTint, position: "absolute", inset: 0,
        borderRadius: "inherit", pointerEvents: "none", zIndex: 5,
      }} />

      {/* Directional label chip positioned outside the card */}
      <motion.div style={{
        opacity: positiveOpacity,
        position: "absolute", top: -50, right: -10,
        transform: "rotate(18deg)", zIndex: 10, pointerEvents: "none",
      }}>
        {/* Positive speech bubble */}
      </motion.div>

      {/* Card content */}
    </motion.div>
  );
}
```

Key craft decisions:
- The velocity-boosted threshold (`offset + velocity * 0.12`) means fast flicks register even at short distance. Users expect this from Tinder/Hinge.
- **Calibrate tint intensity to the product register.** The directional tint should be prominent enough that the user can clearly tell which direction they're selecting at 50% drag distance. For playful products, this might mean 30-40% opacity with a colored border glow. For precise products, 10-15% is enough. The mistake is defaulting to "subtle" regardless of context. If the commit phase is rich and celebratory, a barely-visible tint during preview creates a disconnect. The preview is a promise of the commit. Match the energy.
- **Directional labels should appear early** in the drag (within 20-30px of movement) and build to full visibility. If the user has to drag far before seeing any feedback, they'll think nothing is happening. The label is often the primary feedback element, not a secondary detail.
- The label chip sits outside the card edge and rotates opposite the drag direction for a reactive, comic-book feel.
- Both directions need their own visual language. Don't build the positive direction and leave the negative empty.
- **Buttons on screen should mirror the gesture state.** If the screen has action buttons that represent the same choices as the swipe directions, those buttons should react in real time during the drag: scaling up, filling with color, glowing as the user drags toward "their" direction. This is what Tinder does with its action buttons. Share the drag's progress value (normalized -1 to 1) from the card component to the button components so they can respond proportionally.

### Commit: celebration and exit

When the user commits (past threshold or button tap), fire effects independent of the gesture.

```jsx
const [burstKey, setBurstKey] = useState(null);
const [burstDir, setBurstDir] = useState("right");
const counter = useRef(0);

function triggerSwipe(direction) {
  counter.current += 1;
  setBurstDir(direction);
  setBurstKey(`burst-${counter.current}`);

  setTimeout(() => setIndex(i => i + 1), 350);
  setTimeout(() => setBurstKey(null), 1400);
}

// BOTH the drag handler AND button handler call triggerSwipe
// so both paths produce identical celebrations
```

**Celebration effects should originate from their source.** If the user tapped a button, particles fly from that button's position. If the user swiped and there are corresponding buttons visible, particles should originate from the matching button to create a visual link between the gesture direction and its outcome. Calculate the origin from the button's DOM position relative to the container, not from a hardcoded center point. This is what makes celebrations feel caused by the user's action rather than just triggered by it.

The celebration layer renders directional particles that arc upward. The commit chip pops in with spring overshoot. The card flies off with the swipe's velocity and rotation. See `micro-interaction-craft.md` for the design thinking behind each effect.

---

## Swipe Deck — React Spring + use-gesture

Use this variant in HTML artifacts or Claude Code when you want more physicality: real throw inertia, kinematics-aware exit animations, and coordinated deck springs. The feel difference is subtle but real — React Spring's interruption handling and tension/friction model produce gesture responses that more closely mirror iOS native.

### Why this stack for swipe decks

`useDrag` from use-gesture gives you velocity, direction, distance, and movement in every callback without extra wiring. You know exactly how fast the user threw the card and in which direction, and you use that to calculate the exit trajectory. Motion's `onDragEnd` gives you `info.velocity` too, but use-gesture's kinematics are more complete for complex gesture math.

`useSprings` animates the whole deck as one coordinated system. Every card's position, rotation, and scale is a spring value — when a card exits, the springs beneath it update automatically.

### The pattern

```jsx
import { useSprings, animated, to } from "@react-spring/web"
import { useDrag } from "@use-gesture/react"

const CARD_COUNT = items.length

// Calculate the spring config for each card in the deck
function deckConfig(i, gone, activeIndex, down, mx, vx, dir) {
  const isGone = gone.has(i)
  const isTop = i === activeIndex

  return {
    x: isGone ? (200 + window.innerWidth) * dir : 0,
    rot: isGone ? dir * 10 + (down ? mx / 100 : 0) : 0,
    scale: down && isTop ? 1.05 : 1,
    // Cards behind the top card are offset
    y: isTop ? 0 : (activeIndex - i) * -8,
    config: isGone
      ? { friction: 50, tension: 200 }           // exit: controlled throw
      : { friction: 50, tension: 500 },           // settle: snappy return
  }
}

function SpringSwipeDeck({ items }) {
  const gone = useRef(new Set())
  const [activeIndex, setActiveIndex] = useState(items.length - 1)

  const [springs, api] = useSprings(items.length, i => ({
    x: 0, rot: 0, scale: 1,
    y: (items.length - 1 - i) * -8,
    config: { friction: 50, tension: 500 },
  }))

  const bind = useDrag(({
    args: [index],
    down,
    movement: [mx],
    velocity: [vx],
    direction: [dir],
    cancel,
  }) => {
    // Fast flick: commit immediately even at short distance
    if (down && Math.abs(mx) > 110) {
      gone.current.add(index)
      cancel()
    }

    api.start(i => {
      if (index !== i) return
      const isGone = gone.current.has(index)
      return deckConfig(i, gone.current, activeIndex, down, mx, vx, dir)
    })

    // After animation completes, advance the active index
    if (!down && gone.current.has(index)) {
      setTimeout(() => setActiveIndex(i => i - 1), 600)
    }
  })

  return (
    <div style={{ position: "relative", width: "100%", height: 500 }}>
      {springs.map(({ x, rot, scale, y }, i) => (
        <animated.div
          key={i}
          {...bind(i)}
          style={{
            position: "absolute",
            width: "100%",
            touchAction: "none",
            x, y,
            // Compose rotation and scale into a transform string
            transform: to(
              [rot, scale],
              (r, s) => `rotate(${r}deg) scale(${s})`
            ),
          }}
        >
          {/* Card content */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
            {items[i].content}
          </div>
        </animated.div>
      ))}
    </div>
  )
}
```

### Key craft decisions

- **`to()` for composed transforms.** React Spring's `to` interpolation function lets you combine multiple animated values into a single transform string. This is cleaner than managing a `style` object with separate keys, and avoids transform ordering bugs.
- **`velocity: [vx]` from useDrag.** This is the throw speed the user gave the card. Pass it to the exit spring config (`tension` adjusted by velocity) so fast throws exit faster and slow drags exit at a controlled pace. Motion's `onDragEnd` gives you velocity too, but use-gesture normalises it to pixels/millisecond which is easier to work with in physics math.
- **`gone` as a ref, not state.** The `gone` Set tracks which cards have been committed. It's a ref because updates to it shouldn't trigger re-renders — the springs handle the visual state.
- **`cancel()` for fast flicks.** Calling `cancel()` from useDrag commits the gesture even if the pointer is still down. This is what makes fast flicks feel crisp rather than requiring the user to lift their finger past a distance threshold.
- **Coordinated deck via `useSprings`.** Every card is a spring. When the top card exits, the springs beneath it animate to their new positions automatically because the `deckConfig` function computes position based on `activeIndex`. No manual management of which card is "next."
- **Exit config vs. settle config.** Use different spring configs for the exit (controlled, `tension: 200`) and the settle (snappy, `tension: 500`). The exit should feel like the card is being thrown, not bounced.

---

## Horizontal Carousel

Horizontally scrollable cards with momentum, edge peek, and snap-to-card. Used for featured content, stories, product categories, onboarding steps.

### Anticipation: edge peek and partial cards

The key signal that a carousel is scrollable is showing partial cards at the edges. If every card fits perfectly within the viewport, users don't know there's more.

```jsx
function Carousel({ items, cardWidth = 280, gap = 16, peekAmount = 40 }) {
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalWidth = items.length * (cardWidth + gap) - gap;
  const maxDrag = -(totalWidth - (cardWidth + peekAmount * 2));

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        width: "100%",
        paddingLeft: peekAmount, // leaves room for partial prev card
      }}
    >
      <motion.div
        drag="x"
        style={{ x, display: "flex", gap }}
        dragConstraints={{ left: maxDrag, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          // Snap to nearest card
          const currentX = x.get();
          const rawIndex = Math.round(-currentX / (cardWidth + gap));
          const snappedIndex = Math.max(0, Math.min(rawIndex, items.length - 1));
          setActiveIndex(snappedIndex);
          x.set(-snappedIndex * (cardWidth + gap));
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {items.map((item, i) => (
          <CarouselCard key={item.id} item={item} isActive={i === activeIndex} />
        ))}
      </motion.div>
    </div>
  );
}
```

### Preview: active card scaling

The center/active card can scale slightly larger or elevate with shadow to indicate focus. Cards on either side remain at base scale. This is proportional to scroll position, not a binary switch.

```jsx
function CarouselCard({ item, isActive }) {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1 : 0.93,
        opacity: isActive ? 1 : 0.7,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        width: cardWidth,
        flexShrink: 0,
        borderRadius: 16,
        overflow: "hidden",
      }}
      whileTap={{ scale: isActive ? 0.97 : 0.91 }}
    >
      {/* Card content */}
    </motion.div>
  );
}
```

### Commit and resolution: snap

On drag end, calculate the nearest card position and snap to it. The spring transition handles the resolution. `dragElastic={0.08}` gives a tight rubber-band at the edges so the user feels the boundary without the carousel flying off.

Key craft decisions:
- `peekAmount` (30-50px) on one or both sides signals scrollability. Without it, users don't discover the carousel.
- Snap uses `Math.round` on the offset divided by card+gap width. Simple and reliable.
- Low `dragElastic` (0.08-0.15) for carousels. High elasticity makes carousels feel sloppy. Save high elasticity (0.5-0.7) for swipe decks where overshooting is part of the interaction.
- Active card scaling is optional but adds polish. The difference should be subtle (0.93 vs 1.0), not dramatic.

---

## Bottom Sheet

A draggable sheet from the bottom edge with detent stops, backdrop tracking, and scroll-aware drag.

### Anticipation: trigger and sheet appearance

The sheet slides up with a spring. The backdrop fades in proportionally.

```jsx
function BottomSheet({ isOpen, onClose, detents = [0.5, 1], children }) {
  const sheetRef = useRef(null);
  const y = useMotionValue(0);
  const [currentDetent, setCurrentDetent] = useState(0);

  // Backdrop opacity tracks sheet position
  const backdropOpacity = useTransform(y, [0, 400], [0.5, 0]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with reactive opacity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "#000", zIndex: 40,
            }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              const velocity = info.velocity.y;
              const offset = info.offset.y;

              // Fast downward flick dismisses regardless of position
              if (velocity > 500) { onClose(); return; }

              // Slow drag: snap to nearest detent or dismiss
              if (offset > 150) { onClose(); return; }

              // Snap back to current detent
            }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              zIndex: 50,
              maxHeight: `${detents[detents.length - 1] * 100}vh`,
              overflow: "hidden",
            }}
          >
            {/* Grabber handle */}
            <div style={{
              width: 36, height: 5, borderRadius: 3,
              background: "#ddd", margin: "8px auto 0",
            }} />

            {/* Scrollable content area */}
            <div style={{ overflow: "auto", maxHeight: "calc(85vh - 30px)", padding: 16 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Preview: drag feedback

During drag, the backdrop opacity should track the sheet's y-position. As the user pulls the sheet down, the backdrop lightens, signaling "you're about to dismiss this." This is proportional feedback, same principle as the swipe deck's directional tint.

### Commit: snap to detent or dismiss

On release, the sheet either snaps to a detent stop (half-height, full-height) or dismisses. The decision uses both offset (how far) and velocity (how fast). A fast flick down dismisses even if the sheet barely moved. A slow drag past 150px dismisses. Anything else snaps back.

Key craft decisions:
- `dragElastic={0.15}` for sheets. Slightly more bounce than a carousel but less than a swipe deck. The sheet should feel attached to the bottom, not floating.
- Detent stops (e.g., 50% and 100% of screen height) are what separate a prototype-quality sheet from a real one. Apple Maps, ride-sharing apps, and music players all use multi-detent sheets.
- The grabber handle (36x5px, rounded, centered) is a universal affordance. Without it, users don't know the sheet is draggable.
- Scroll-inside vs drag-the-sheet: when the sheet's content is scrollable, the sheet should only respond to drag on the grabber area or when the content is scrolled to the top. This prevents fighting between sheet drag and content scroll. For prototypes, pinning drag to the grabber handle area is the simplest reliable approach.

---

## Tab Shell

Tab-based navigation with instant switching, active indicator, and optional swipe-between-tabs.

### The basics: instant switching

iOS and Android both use instant tab switching. No slide animation, no crossfade. The content changes immediately. This is deliberate: tabs represent parallel views, not sequential steps.

```jsx
function TabShell({ tabs, accentColor = "#007AFF" }) {
  const [active, setActive] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Content area */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tabs[active].content}
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex",
        height: 83, // iOS: 49pt bar + 34pt safe area
        paddingBottom: 34,
        borderTop: "1px solid rgba(0,0,0,0.08)",
        background: "#fff",
      }}>
        {tabs.map((tab, i) => (
          <motion.button
            key={tab.id}
            onClick={() => setActive(i)}
            whileTap={{ scale: 0.9 }}
            style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: i === active ? accentColor : "#8E8E93",
              position: "relative",
            }}
          >
            {/* Icon */}
            <div style={{
              position: "relative",
              transition: "transform 0.15s ease",
              transform: i === active ? "scale(1)" : "scale(0.95)",
            }}>
              {tab.icon}

              {/* Notification badge */}
              {tab.badge && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: "absolute", top: -4, right: -8,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: "#FF3B30", color: "#fff",
                    fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 5px",
                  }}
                >
                  {tab.badge}
                </motion.div>
              )}
            </div>

            {/* Label */}
            <span style={{
              fontSize: 10, fontWeight: i === active ? 600 : 500,
              transition: "color 0.15s ease",
            }}>
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

### Active indicator

For top-positioned tab bars (like segmented controls or section tabs), an animated underline that slides between tabs adds polish. For bottom tab bars (main app navigation), the color change is usually sufficient.

```jsx
// For top tab bars / segmented controls with a sliding indicator
function TopTabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", position: "relative", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      {/* Sliding indicator */}
      <motion.div
        layout
        style={{
          position: "absolute", bottom: 0,
          height: 2, background: accentColor,
          borderRadius: 1,
        }}
        // Position and width animate via layout
        animate={{
          left: `${(active / tabs.length) * 100}%`,
          width: `${100 / tabs.length}%`,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onChange(i)} style={{ flex: 1, /* ... */ }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Swipe between tabs (optional)

Some apps (Instagram, Twitter/X) allow horizontal swiping between tabs. This is a gesture enhancement, not a replacement for tap.

```jsx
// Wrap tab content in a horizontal drag container
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.3}
  onDragEnd={(_, info) => {
    if (info.offset.x < -80 && active < tabs.length - 1) setActive(a => a + 1);
    if (info.offset.x > 80 && active > 0) setActive(a => a - 1);
  }}
>
  {tabs[active].content}
</motion.div>
```

Key craft decisions:
- Bottom tab switching is instant. No transition. This is how iOS and Android both work. Animating between bottom tabs feels wrong because tabs are parallel, not sequential.
- Top tabs / segmented controls can have a sliding indicator because the tabs represent views within the same spatial context.
- Notification badges spring in with `scale: 0 → 1` so they feel like they appeared, not like they were always there. Use the system red (`#FF3B30` on iOS) unless the product has its own badge color.
- Tab bar height: 83pt on iOS (49pt bar + 34pt safe area). On Android, 56dp with no bottom safe area needed unless the device has a gesture bar.
- `whileTap={{ scale: 0.9 }}` is more aggressive than most UI buttons (which use 0.97). Tab icons are small targets and need stronger feedback to feel tappable.

---

## Card Expand / Detail View

A card that expands to reveal more content. Two variants: inline expand (accordion-style within a list) and full-screen takeover (App Store-style hero expansion).

### Inline expand

The card grows in place to show hidden content. Surrounding items reflow.

```jsx
function ExpandableCard({ title, preview, detail }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => setIsOpen(!isOpen)}
      style={{
        borderRadius: 16, padding: 16, background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer", overflow: "hidden",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.h3 layout="position">{title}</motion.h3>
      <motion.p layout="position" style={{ color: "#666", marginTop: 4 }}>{preview}</motion.p>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ marginTop: 12 }}
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand indicator */}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ position: "absolute", top: 16, right: 16 }}
      >
        <ChevronDown size={20} />
      </motion.div>
    </motion.div>
  );
}
```

### Full-screen takeover

The card scales up from its list position to fill the screen, revealing full content behind it. A backdrop appears. Dismissible by dragging down or tapping close.

```jsx
function ExpandableHeroCard({ item, children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);
  const scale = useTransform(y, [0, 300], [1, 0.9]);

  return (
    <>
      {/* Collapsed card in list */}
      <motion.div
        layoutId={`card-${item.id}`}
        onClick={() => setIsExpanded(true)}
        style={{
          borderRadius: 16, overflow: "hidden",
          cursor: "pointer", position: "relative",
        }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Card preview content */}
      </motion.div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.6)", zIndex: 40,
              }}
            />

            <motion.div
              layoutId={`card-${item.id}`}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              style={{
                y, scale,
                position: "fixed", inset: 0, zIndex: 50,
                background: "#fff", borderRadius: 0,
                overflow: "auto",
              }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 400) {
                  setIsExpanded(false);
                }
              }}
            >
              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setIsExpanded(false)}
                style={{
                  position: "sticky", top: 16, right: 16, float: "right",
                  width: 32, height: 32, borderRadius: 16,
                  background: "rgba(0,0,0,0.4)", border: "none",
                  color: "#fff", cursor: "pointer", zIndex: 10,
                }}
              >
                ✕
              </motion.button>

              {/* Full content */}
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

Key craft decisions:
- `layoutId` is the magic ingredient. Motion automatically animates the card from its list position to the full-screen position, matching size, position, and border-radius. No manual coordinate math needed.
- Drag-to-dismiss uses the same pattern as bottom sheet: `drag="y"` with `dragConstraints={{ top: 0 }}`, dismiss on offset > 120 or velocity > 400.
- During drag-to-dismiss, the card scales down slightly (`useTransform` mapping y to scale 1 → 0.9) which creates the feeling of "peeling away" from the full-screen state.
- The backdrop opacity tracks the drag position so the user sees the underlying content returning as they pull the card down.
- Inline expand needs `layout="position"` on children to prevent text from stretching during the height animation. Without it, the text warps as the container grows.
- The chevron rotates 180 degrees as an expand indicator. Small detail, but it confirms the tap worked and signals that tapping again will close.

---

## Accessibility Across All Patterns

Every pattern above should include:

```jsx
import { useReducedMotion } from "framer-motion";

function Component() {
  const prefersReduced = useReducedMotion();

  const transition = prefersReduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 300, damping: 25 };

  const dragProps = prefersReduced
    ? {}
    : { drag: "x", dragElastic: 0.7, onDragEnd: handleDragEnd };

  return <motion.div transition={transition} {...dragProps} />;
}
```

When reduced motion is active:
- Swipe decks work via button taps (the buttons are required, not optional)
- Carousels scroll via arrow buttons or pagination dots
- Sheets dismiss via a close button, not just drag
- Expanded cards close via a close button, not just drag-to-dismiss
- Tab switching remains instant (it already is)

The gesture is always the enhancement, not the only path. Every drag-based interaction must have a tap-based alternative.
