# Micro-Interaction Craft for Prototypes

Every interaction in an app has a story: something is about to happen, it's happening, it happened, and here's where we are now. Most prototypes only build the "it happened" part. This reference teaches you to think through all four phases for any interaction pattern.

The framework is universal. A swipe deck in a dating app and a task completion in a project management tool both follow the same four phases. What changes is the emotional register: playful vs precise, celebratory vs confirming, dramatic vs subtle. The product context determines the energy. The phases determine the structure.


## The Four Phases

### 1. Anticipation (before the gesture begins)

The user hasn't touched anything yet, but the interface signals that interaction is possible and hints at what kind.

**What to think about:**
- Does the element communicate that it's interactive? A card stack showing depth (2-3 cards behind, each slightly offset and scaled down) tells the user there's a deck to swipe. A draggable handle or grabber bar signals pull-ability.
- Is there ambient motion? A subtle breathing animation, a peeking card edge, a pulsing CTA. Anticipation shouldn't be aggressive, just present.
- On desktop, hover states belong here. On mobile, anticipation usually comes from visual cues in the static layout rather than motion.

**Common mistakes:**
- No depth in card stacks (just one card, no sense of "more behind it")
- Interactive elements that look static (no affordance)
- Using staggered entrance animations as a substitute for anticipation (staggered entrances say "I just loaded," not "you can interact with me")

### 2. Preview (mid-gesture, before commit)

The user is in the middle of a gesture. They're dragging a card, pulling down on a list, sliding a toggle. They haven't let go. The interface should show them what will happen if they commit, scaled proportionally to how far they've gone.

**What to think about:**
- What reactive values should map to the gesture? For a drag: rotation, directional tint, a label chip fading in, emoji or indicators appearing, a background color shifting. These should all be driven by `useMotionValue` + `useTransform` so they track the gesture in real time.
- What's the threshold indicator? The user needs to sense when they've crossed the commit point. This can be a label reaching full opacity, a tint saturating, a scale change, or a subtle snap in the physics.
- Does the feedback match the direction/intent? A rightward drag might show green tint and a positive label. A leftward drag might show red tint and a negative label. Up might mean "archive" and down might mean "snooze." The feedback must be directional, not generic.

**The key principle:** Everything in preview is proportional to the gesture. Nothing fires independently. If the user drags 30% of the way, the feedback is at 30%. If they drag back to zero, the feedback returns to zero. This is what `useTransform` is for.

**Implementation pattern:**
```jsx
const x = useMotionValue(0);
// Preview feedback that scales with drag distance
const rightTint = useTransform(x, [0, 50, 130], [0, 0.15, 0.5]);
const leftTint = useTransform(x, [-130, -50, 0], [0.5, 0.15, 0]);
const chipOpacity = useTransform(x, [0, 60, 120], [0, 0.3, 1]);
const chipOpacityNeg = useTransform(x, [-120, -60, 0], [1, 0.3, 0]);
```

**Common mistakes:**
- Binary feedback (nothing until threshold, then everything at once). This feels like a switch, not a gesture.
- Feedback that doesn't reverse when the user drags back. If I drag right and see "YUM!" but then drag back left, the "YUM!" must fade and the opposite feedback must appear.
- Only building the "positive" direction and leaving the "negative" direction blank. Both directions need their own visual language.

### 3. Commit (release past threshold)

The user let go past the threshold. The decision is made. Now the interface responds with an animation that's independent of the gesture, it fires as a triggered event, not a reactive value.

**What to think about:**
- How does the committed element leave? It should exit with the velocity and direction of the gesture. A swiped card should fly off in the swipe direction with rotation. A dismissed notification should slide out the way it was pushed. The exit should feel like a continuation of the user's force, not a canned animation.
- Is there a celebration or confirmation? The emotional register of the product determines this. Playful products (dating, food, games) get particles, speech bubbles, color bursts. Professional products (banking, SaaS, email) get clean fades, checkmarks, subtle confirmations. Fitness and achievement products get confetti, bold typography, sound.
- Do indicators or labels pop in? A "YUM!" or "NOPE" chip that springs in with overshoot and rotation feels comic-book and fun. A clean checkmark that fades in feels precise. A toast notification that slides up feels informational. Match the product.
- What about particles? If the product register calls for them, particles should arc upward (celebratory), not radially (explosive). Bias the direction toward the swipe. Give each particle a random angle within a directional cone, random velocity, slight upward bias, and rotation. 8-14 particles is plenty. They should live for about 1 second and fade out before the end.

**The key principle:** Commit is where the prototype earns its personality. A flat fade-out with no feedback feels like a bug. A well-choreographed exit with directional celebration feels like a polished product.

**Common mistakes:**
- No commit animation (the card just disappears and the next one appears). This is the most common failure in prototypes.
- Commit animation only on the gesture path, not on the button path. If tapping "Like" skips the celebration that swiping right produces, the button feels broken. Both paths must trigger the same commit sequence.
- Over-the-top celebration for mundane actions. Archiving an email doesn't need confetti. Match the energy to the significance.
- Effects that originate from nowhere. Particles, emoji, confetti should have a clear source: the button that was tapped, the card that was swiped, the element that triggered the action. When effects emerge from an arbitrary point on screen, they feel decorative instead of caused. Study how Duolingo handles lesson completion: the particles come from the thing you tapped, not from the center of the viewport.

### 4. Resolution (settling into the new state)

The commit animation has played. Now the interface needs to reach its new resting state.

**What to think about:**
- How does the next element enter? In a card deck, the next card should already be visible behind the current one (the anticipation phase set this up). On commit, it scales up and settles into place with a confident spring. It shouldn't pop in from nowhere.
- Do any indicators update? Progress bars advance, step counters change, tab states shift. These updates should happen during or just after the commit animation, not before it.
- Is the interface ready for the next interaction immediately? The user should be able to start the next gesture as soon as the resolution spring settles. If the resolution takes too long, the prototype feels sluggish.

**Common mistakes:**
- Next element appears from nowhere instead of being revealed from the stack behind
- Progress indicators update before the commit animation finishes (breaks causality)
- Resolution spring is too bouncy, making the user wait before they can interact again


## Applying the Phases to Common Patterns

### Swipe Deck (Tinder, food preferences, onboarding quiz)

| Phase | What happens |
|---|---|
| Anticipation | 2-3 cards stacked behind the active card, each offset 8-12px down and scaled 3-5% smaller. The stack communicates "there's more." |
| Preview | Card rotates with drag (±15-18°). Directional color tint washes over the card. A label chip fades in at the card edge ("YUM!", "NOPE", "SKIP"). Emoji or indicators appear around the card, each at a different rotation. All proportional to drag distance. |
| Commit | Card flies off-screen in the drag direction with rotation and velocity. Label chip pops to full size with spring overshoot. Particles burst from the card center, arcing upward with directional bias. Action button flashes its active color. |
| Resolution | Next card scales up from 0.92 to 1.0 with a confident spring. Progress pips advance. Stack depth adjusts. If it's the last card, transition to completion state. |

### Bottom Sheet (filters, details, confirmations)

| Phase | What happens |
|---|---|
| Anticipation | A subtle shadow or overlay hint behind the trigger area. The grabber handle is visible. |
| Preview | Sheet position tracks the drag. Backdrop opacity maps to sheet position. The sheet snaps to detent points if the design has them. Content inside the sheet may blur or scale slightly as the sheet moves. |
| Commit | Sheet snaps to full height, dismiss point, or a detent. Spring with high damping (no wobble). Backdrop completes its opacity transition. |
| Resolution | Content inside the sheet becomes interactive. If dismissed, the backdrop fades and the underlying content resumes. |

### List Row Actions (email swipe, task complete, delete)

| Phase | What happens |
|---|---|
| Anticipation | The row looks standard. No hint of hidden actions until the user starts to drag. |
| Preview | Row slides to reveal action area behind it. The action area has a color (green for complete, red for delete) and an icon that scales up as the row is dragged further. If the row passes the threshold, the icon might snap to full size. |
| Commit | Row snaps fully open (showing the action) or completes the action directly. For destructive actions: the row collapses with a spring, and items below it close the gap. For toggles: the icon pulses or checks, then the row snaps back. |
| Resolution | List re-layouts smoothly. Any counters or badges update. A toast or undo bar may slide in from the bottom. |

### Multi-Step Flow (onboarding, checkout, wizard)

| Phase | What happens |
|---|---|
| Anticipation | Current step is clearly indicated. The next step might peek in from the edge, or the progress bar shows how much is left. |
| Preview | If steps are swipeable, the transition between steps is gesture-driven. Content cross-fades or slides proportionally. |
| Commit | Step transition completes. Progress indicator advances with a subtle animation (fill, pip color change, counter increment). |
| Resolution | New step content is ready for interaction. Back button updates. On the final step, the CTA changes to reflect completion. |

### Toggle / Switch

| Phase | What happens |
|---|---|
| Anticipation | The switch has a clear on/off visual state. The thumb might have a subtle shadow that signals it's grabbable. |
| Preview | If draggable, the thumb tracks the finger. The track color transitions gradually from off to on. |
| Commit | Thumb snaps to the new position with a spring. Track color completes its transition. A subtle bounce on the thumb (slight overshoot) makes it feel physical. |
| Resolution | Any dependent UI updates (a settings panel expanding, a feature enabling, options appearing). These should animate in with a slight delay after the toggle commits. |


## Emotional Register by Product Type

The same four phases apply to every product. What changes is the energy.

| Product Type | Anticipation | Preview | Commit | Resolution |
|---|---|---|---|---|
| **Playful** (dating, food, games) | Depth, peek, wobble | Color tints, emoji, speech bubbles | Particles, spring overshoot, bold label pop | Bouncy spring, celebratory completion |
| **Precise** (banking, fintech, healthcare) | Clean affordance, no animation | Directional indicator, progress fill | Clean exit, checkmark fade, subtle pulse | Smooth settle, no bounce, immediate readiness |
| **Energetic** (fitness, social, music) | Pulsing, breathing, rhythm | Haptic-suggesting feedback, scale changes | Confetti, bold type flash, streak animations | Quick spring, ready for next action |
| **Editorial** (news, reading, content) | Elegant reveal, typography hierarchy | Smooth parallax, content peek | Page turn, crossfade, bookmark animation | Content settles, next article peeks |
| **Minimal** (notes, productivity, tools) | Almost nothing. Clean static layout. | Drag indicator only, no decoration | Slide out, opacity fade, done | Instant ready state, no flourish |

The register isn't about adding or removing effects. It's about matching the user's emotional expectation. A user swiping through food options expects fun. A user confirming a wire transfer expects precision. Building the wrong register is worse than building no micro-interactions at all.


## Checklist Before Building

For each core interaction in the prototype, answer these before writing code:

1. What does the user see before they start? (anticipation)
2. What changes as they drag/press/scroll? (preview, reactive, proportional)
3. What happens the moment they commit? (commit, triggered, independent)
4. What does the new resting state look like? (resolution)
5. Does the button path produce the same commit feedback as the gesture path?
6. Does the emotional register match the product type?
7. Is the preview phase reactive (useTransform) or binary (opacity 0 or 1)?
8. What else on this screen should respond to this gesture? Walk through every visible element and decide: participant or bystander. In the best apps, there are no bystanders.
9. Where do celebration effects originate from? They should have a clear, logical source (the button, the card, the element being acted on), not appear from the center of the screen.
10. Does the preview intensity match the commit energy? If the commit is rich and celebratory but the preview is barely visible, there's a mismatch. The preview is a promise. It needs to foreshadow what's coming.
11. At 50% gesture progress, can you clearly tell which direction/action is being selected? If not, the feedback isn't visible enough.
12. Which shipped app handles this pattern best? What do they do that you might be missing?
