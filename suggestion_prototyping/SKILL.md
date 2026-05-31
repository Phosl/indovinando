---
name: interactive-prototype
description: "Build high-fidelity interactive prototypes in React artifacts that feel like real apps, not websites. Uses the Motion library (formerly Framer Motion) for physics-based animations, gestures, and transitions. Covers swipe decks, tab shells, bottom sheets, onboarding flows, carousels, and more. Use when the user asks to: 'build a prototype', 'make it interactive', 'swipe flow', 'onboarding flow', 'mobile prototype', 'make it feel like an app', 'card stack', 'tab navigation', 'tinder-like', 'swipeable', 'drag to dismiss', 'app prototype', or shares Figma screens and asks to build something interactive. Do NOT use for static mockups, dashboards, landing pages, or marketing sites."
metadata:
  author: Yummy Labs
  version: 4.0.0
  category: prototyping
---

# Interactive Prototype Craft

You are building something someone will hold in their hand and swipe, tap, and feel. Not a React component. Not a web page. A physical experience that happens to be made of code.

This skill has four jobs: read the design accurately, think through the interactions the designer hasn't drawn, fill gaps with strong opinions, and build something that feels right on the first try.

**The workflow is sequential and has a hard stop.** Steps 1-2 (read + think + ask) happen in one turn. Then you STOP and wait for the designer's answers. Steps 3-8 (decide + design + build) happen after. Never collapse this into a single turn. The designer must have the chance to shape the prototype before any code is written.


## Step 1: Read the Design

Before asking questions, before writing code, extract every visual detail you can from whatever the designer shared. This is the foundation everything else is built on.

**If the designer shared Figma URLs:**
Call `get_design_context` from the Figma MCP. This gives you exact hex values, pixel measurements, font stacks, shadows, border radii, and layout structure. Do not approximate from memory or screenshots when Figma data is available.

**Be careful with Figma data that belongs to the design file, not the UI.** Frame borders, artboard backgrounds, annotation colors, and device chrome are file-level decoration. If a border or background color doesn't appear in the actual screenshot, it's probably the Figma canvas, not part of the interface.

**If the designer shared screenshots (no Figma MCP):**
Study the images carefully and write out a design spec as a visible comment in your response. Extract and list:
- Every color you can identify (backgrounds, text, accents, cards, buttons) as hex values
- Font family (look for clues: rounded = likely SF Pro or system, geometric = Poppins/Inter, serif = obvious)
- Font sizes and weights (estimate from visual hierarchy: heading vs body vs caption)
- Spacing values (look for consistent rhythm: 8px grid? 4px? measure from edges and between elements)
- Border radius on cards, buttons, badges, avatars
- Shadows (subtle drop shadow? elevated card? inner shadow on buttons?)
- Any distinctive UI patterns (pill badges, progress indicators, custom icons, overlapping avatars)

Write this spec visibly so the designer can correct mistakes before you build anything. Say something like: "Here's what I'm reading from your screens. Let me know if any of these are off before I start building."

**If the designer described something in words:**
Ask about the visual direction. You need enough to avoid the generic AI look. At minimum: dark or light, what the accent color is, whether it's playful or serious, and if there's a reference app that captures the feel they want.

**Why this matters:** The number one reason prototypes require multiple iterations is wrong visual values. A card with 20px radius looks fundamentally different from one with 8px. Getting the design right on the first build saves more time than any amount of interaction polish.


## Step 2: Think Through the Experience (Then Ask What You Don't Know)

Designers share screens. Screens show moments. But an interactive prototype is the space between moments: the transitions, the gestures, the feedback, the edge cases, and the emotional arc. Your job before building anything is to think through the full experience as a user would feel it, identify what you still don't know, and then ask the designer about the things that will actually change how you build.

### Think like a user, not a builder

Before you start cataloguing components and interaction patterns, close your eyes and walk through the experience from the user's perspective. What are they feeling when they arrive at this screen? What are they trying to accomplish? What does success feel like? What could go wrong?

This is different from listing UI interactions. A builder looks at a card deck and thinks: "drag left/right, exit animation, next card enters." A user feels: "Am I making the right choice? Can I go back? How many more are there? Is this fun or tedious?" The prototype needs to answer the user's questions, not just implement the builder's list.

### Study real apps that do this well

Before building any interaction pattern, think about which shipped apps handle this same pattern beautifully. Tinder, Hinge, Bumble for swipe decks. Apple Wallet for stacked cards. Duolingo for progress and celebration. Spotify for carousels. iOS Mail for row swipe actions. Airbnb for bottom sheets and filters.

You don't need to copy them. But you need to notice what they do that most prototypes don't. The craft details that make them feel right:

In Tinder, the action buttons at the bottom don't just sit there during a swipe. They respond. The matching button scales up, fills with color, glows. This tells you which button your gesture maps to before you commit. Every element on screen participates in the gesture.

In Duolingo, when you complete a lesson, the celebration particles don't fly from some arbitrary point in the center of the screen. They originate from the thing you tapped. The confetti has a source. This makes the celebration feel caused by your action, not just triggered by it.

In Apple Wallet, when you drag a card, the cards behind it spread to make room. The entire stack is a connected system. Nothing is a bystander.

These details aren't decorative. They're the difference between "functional prototype" and "this feels like a real app." Before you build, ask yourself: "What would the best version of this interaction feel like? Which app has already solved this?"

### The screen is one connected system

This is the most common mistake in prototypes, and it's a thinking mistake, not a code mistake: treating each element on screen as independent. A card that can be swiped. Buttons that can be tapped. A progress bar that advances. Each built separately, each doing its own thing.

In a real app, every visible element participates in the interaction. When the user starts a gesture, the whole screen responds:

- The element being gestured on provides direct feedback (rotation, tint, position)
- Buttons that represent the same action mirror the gesture state (scale, color, glow)
- Background or peripheral elements shift subtly to reinforce direction
- Progress indicators hint at what's about to change
- Labels or overlays fade in to name the action

The question to ask yourself for every gesture: **"What else on this screen should respond to this, and how?"** Walk through each element visible in the design and decide: is it a participant or a bystander? In the best apps, there are no bystanders.

### What interactions are implied but not drawn?

Look at the screens as a sequence and ask: what happens in the moments between them?

Think about: What does mid-gesture look like? What feedback confirms direction before the user commits? Is there a celebration or is it quiet? How does the next state enter? Can the user undo? What happens at the end of the sequence?

### What's the emotional register?

The product context determines how every interaction should feel. A playful app needs bold, visible, joyful feedback. A precise app needs clean, restrained confirmation. Match the energy. And be consistent across phases: if the commit phase is rich and expressive, the preview phase needs to build toward that energy, not whisper while the commit shouts.

### What content makes this feel real?

Placeholder data that's obviously fake ("John Doe", "Lorem ipsum", "Item 1") undermines the prototype. Content should match the product's world. Real-sounding names in the right language. Actual price points. Plausible distances. The content sells the interaction.

### Calibrate feedback intensity to the product register

A common mistake is building preview feedback (tints, labels, directional indicators) at a fixed intensity regardless of the product. Instead, calibrate: How dramatic is the commit phase? The preview should build toward it proportionally. If the commit is rich and celebratory, but the preview is barely noticeable, there's a disconnect. The user drags and sees almost nothing, then releases and gets an explosion. The preview is a promise of what's coming. It needs to match the energy of what it's promising.

Think about it the other way: if someone showed you only the preview state (frozen mid-gesture), could you tell what kind of product this is? Could you tell whether the action is positive or negative? If the answer is no, the preview isn't doing its job.

### Now ask questions

**MANDATORY GATE: You must ask questions and wait for answers before writing any code.** Do not proceed to Step 3 until the designer has responded. This is not optional, even if you feel confident about the answers. The entire point is that the designer gets to shape the prototype before it exists, not after. Skipping this step and building first means the designer is reacting to your assumptions instead of making their own decisions. That's backwards.

After you've thought through all of this, you'll have a clear picture of what you know and what you don't. Some of those unknowns you can fill with strong opinions (Step 3). Others genuinely need the designer's input because the answer changes how you build.

Use `ask_user_input` to ask about the things that matter. Lead each question with your best idea so the designer can react instead of invent. The number of questions depends on the complexity of the interaction: a simple button press might need none, a multi-gesture flow with coupled elements might need several. Don't limit yourself, but don't pad either. Every question should reflect a genuine decision point where two reasonable paths lead to meaningfully different experiences.

**The `ask_user_input` tool caps at 3 questions per call.** If you have more than 3 genuine decision points, make multiple calls or ask the remaining questions in prose after the first set. Do not compress your questions to fit the tool's limit. The tool constraint is not a question budget.

**Do not ask about things you can already see or reasonably infer.** If the screenshots show a close button, don't ask about dismissal. If the design language is clearly playful, don't ask "should this feel playful or serious?" Use the context.

**Your turn ends after asking questions.** Present your design spec (from Step 1), share what you've thought through (from Step 2), then ask your questions. Wait for the designer's response before moving to Step 3.


## Step 3: Fill the Gaps (Make Decisions, Explain Them)

After the designer answers your questions, there will still be unspecified details. Colors the screenshots didn't fully reveal. Shadow depths you can't pixel-match. Card surfaces that weren't shown. Transition states nobody designed yet.

Do not default to safe, generic choices here. Make an opinionated decision based on what you can see, and briefly explain your reasoning so the designer can redirect if needed.

### Extract the design system first — mandatory before any invention

Before filling a single gap, write out your extracted design system as a visible list. Every hex color you identified. Every border radius. Every font weight. Every shadow. Every spacing value. This list is the only palette you're allowed to invent from.

Every invented value must trace back to something already in that list. Not a new color — a shade of an existing one, derived by lightening or darkening. Not a new radius — a value consistent with radii already present. Not a new shadow — an intensity that matches the shadows you already saw. If you want to add a pressed state, darken the button's existing color. If you want to add a card surface, pick a shade derived from the background already in the design.

**If you can't trace an invention back to something in the extracted list, you don't have enough information. Go back to Step 1 or ask.**

This rule exists because the most common prototype failure isn't wrong interactions — it's colors and values that don't belong to the design system. A correct button press animation in a wrong color feels worse than no animation at all. Inventing freely from general design knowledge produces prototypes that feel like a different product.

**How this sounds in practice:**

"Here's what I extracted from your screens: background `#0F2318`, card surface not shown, accent `#4ADE80`, text white / `rgba(255,255,255,0.6)`, button radius 28px, card radius 20px, shadow `0 8px 32px rgba(0,0,0,0.4)`. Your card surface wasn't shown, so I derived `#1B4129` — one step lighter than the background in the same green family. Added a 1px `rgba(255,255,255,0.08)` border to lift it. If you want more contrast, I can push it further."

"The design doesn't specify what happens on commit. The accent is `#4ADE80` and your existing UI uses it for positive actions, so I made the commit chip and particle burst use that same green. Upward arc for the particles — matches the celebratory register of the rest of the design."

"No pressed state was designed for the action buttons. Your buttons already have a drop shadow, so I added `translateY(4px)` + `scale(0.96)` on press — the vertical shift lets the button 'land' into its shadow, which makes the depth feel physical. No new colors introduced."

The key: you are not asking permission. You are sharing your design reasoning so the designer knows what you did and why, and can course-correct from a concrete starting point. But everything you invent must be rooted in what's already there.


## Step 4: Design the Micro-Interactions

This is the step most prototypes skip, and it's the difference between "functional" and "feels real." Before writing code, think through the micro-interaction layer for every gesture and action in the prototype.

For the complete micro-interaction thinking framework with pattern-specific guidance, read `references/micro-interaction-craft.md`.

### The core idea: every interaction has phases

Most interactions aren't binary (nothing → done). They have a buildup, a moment of commitment, and a resolution. The micro-interactions live in these phases.

**Anticipation (before).** The user is approaching the interaction. A button might scale subtly on hover (desktop) or the card stack might shift to reveal depth. This phase says "something is about to happen."

**Preview (during).** The user is mid-gesture but hasn't committed. A card being dragged shows directional feedback: a color tint, a label chip, floating indicators. This phase says "here's what will happen if you let go now." Everything in preview is tied to the gesture's position or velocity using `useTransform`. It scales proportionally with the user's input. Nothing fires independently.

**Commit (on release past threshold).** The user has committed. Now the interface celebrates, confirms, or resolves. A card flies off with rotation and velocity. A chip pops in with spring overshoot. Particles burst in the swipe direction. Buttons flash their active color. This phase says "it's done, and it felt good." Commit animations fire independently: they're triggered events, not gesture-bound. They can be more dramatic than previews because the decision is made.

**Resolution (after).** The interface settles into its new state. The next card lands. The stack adjusts. A progress indicator advances. This phase says "here's where we are now."

Think through all four phases for every core interaction before writing code. The preview phase is where most prototypes fail because it requires reactive values (`useMotionValue`, `useTransform`) tied to the gesture, which is harder than fire-and-forget animations.

### Every element participates in the gesture

If a screen has both a gesture path (swiping a card) and a button path (tapping "Like"), the relationship runs deeper than "both should trigger the same animation."

**Buttons and gestures are a connected system, not parallel inputs.** During a gesture, the corresponding button should react in real time. As the user drags toward "Like," the Like button should show it: scaling up, filling with color, glowing. This creates a visual link that tells the user "your gesture is selecting this option" before they commit. Without it, the buttons feel like they belong to a different screen.

The same principle applies to any element that represents the gesture's outcome: progress indicators, directional labels, background tints, peripheral UI. The question is always: "What else on this screen should respond to this gesture, and how?"

**Celebrations and effects should originate from their cause.** When a gesture triggers particles, the particles should emerge from the point of action, not from the center of the screen. If the user tapped a button, particles fly from the button. If the user swiped and there are associated buttons visible, particles originating from the corresponding button create a stronger visual connection than particles from the card itself. Effects that have a clear source feel caused. Effects that appear from nowhere feel decorative.


## Step 5: Build With Motion

### Use the library's APIs, don't reimplement them

Both Motion and React Spring exist to solve problems that are hard to get right manually: gesture tracking, spring physics, exit animations, coordinated transitions, and accessibility. If you find yourself writing manual pointer event handlers, calculating velocity by hand, using `setTimeout` to sequence animations, or managing enter/exit states with boolean flags, stop. The library almost certainly has a declarative API for what you're doing.

Concrete examples of what this means:
- Drag behavior → `drag="x"` or `useDrag`, not `onPointerDown` + `onPointerMove` + manual position tracking
- Exit animations → `AnimatePresence` or `useTransition`, not conditional rendering with `setTimeout`
- Values that track a gesture → `useMotionValue` + `useTransform` or spring interpolation, not `useState` updated in a `requestAnimationFrame` loop
- Sequencing between exits and entrances → the library's lifecycle callbacks and mount/unmount orchestration, not imperative timers

The patterns in `references/motion-patterns.md` show how to implement each common interaction using the library's own APIs. Start from those patterns and adapt, rather than building from raw primitives.

### Library choice by context

There are two real options depending on where the prototype runs. Pick one and commit to it — don't mix both in the same artifact.

**Option A: Motion (default for React JSX artifacts)**

Motion (formerly Framer Motion) is pre-bundled in the Claude artifact environment. It's the right default for React artifacts because there's no import overhead and the API is declarative and fast to write.

```jsx
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useVelocity, useReducedMotion } from "framer-motion"
```

**Why Motion instead of raw CSS/JS:**
- `drag="x"` replaces 40+ lines of pointer capture, velocity tracking, and damping math
- `AnimatePresence` handles exit animations that CSS transitions cannot
- Spring physics with `type: "spring"` feel more natural than any cubic-bezier curve
- `whileTap`, `whileHover`, `whileDrag` replace manual event handlers
- `useReducedMotion` provides accessibility in one line
- Motion values update without React re-renders, so animations stay smooth

**Option B: React Spring + use-gesture (for HTML artifacts or Claude Code)**

When the prototype needs more physicality — real inertia on throw, tension/friction tuning, or gesture kinematics like velocity and direction — use `@react-spring/web` with `@use-gesture/react`. This is the pmndrs stack (same team behind react-three-fiber and zustand), and it's what powers the gesture examples on react-spring.dev that feel closest to native mobile.

In an HTML artifact, import via CDN:
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client",
    "@react-spring/web": "https://esm.sh/@react-spring/web@10",
    "@use-gesture/react": "https://esm.sh/@use-gesture/react@10"
  }
}
</script>
```

Then in your component:
```jsx
import { useSpring, useSprings, animated, useTransition } from "@react-spring/web"
import { useDrag, useGesture } from "@use-gesture/react"
```

**Why React Spring + use-gesture over Motion for gesture-heavy work:**
- Spring config uses `tension` and `friction` (real physics parameters) rather than `stiffness` and `damping` — easier to dial in the exact feel
- `useDrag` from use-gesture exposes full kinematics: `velocity`, `direction`, `distance`, `delta` in every callback — you get this data without any extra work
- Interruption handling is better: when a user reverses direction mid-gesture, the spring carries actual momentum through the reversal instead of restarting
- `useSprings` lets you animate an entire deck of cards as a coordinated system with one hook call

For complete patterns with both libraries (swipe decks, carousels, bottom sheets, tab shells), read `references/motion-patterns.md`.

### Spring presets by product feel

These work for both Motion (use `stiffness`/`damping`) and React Spring (use `tension`/`friction`):

| Product feel | Motion preset | React Spring preset | Use for |
|---|---|---|---|
| Snappy, efficient | `{ stiffness: 400, damping: 30 }` | `{ tension: 400, friction: 30 }` | SaaS, productivity, e-commerce |
| Smooth, confident | `{ stiffness: 200, damping: 25 }` | `{ tension: 200, friction: 25 }` | Consumer apps, social, fintech |
| Playful, bouncy | `{ stiffness: 300, damping: 12 }` | `{ tension: 300, friction: 10 }` | Food apps, celebrations, onboarding |
| Calm, gentle | `{ stiffness: 120, damping: 14 }` | `{ tension: 120, friction: 14 }` | Healthcare, wellness, meditation |
| Weighty, dramatic | `{ stiffness: 200, damping: 20, mass: 2 }` | `{ tension: 200, friction: 20, mass: 2 }` | Full-screen modals, page transitions |

For easing curves, timing, and advanced tuning, defer to the `ux-motion` skill's easing reference rather than prescribing values here. The prototype skill owns the patterns. The motion skill owns the physics.

### When neither library is available

Fall back to CSS transitions with the pointer capture pattern. Use `setPointerCapture` for drag tracking and CSS `transition` for animations. Keep the easing simple: `cubic-bezier(0.2, 0, 0, 1)` for entrances, `cubic-bezier(0.3, 0, 1, 1)` for exits. Do not use overshoot curves (`y1 > 1` values) unless the product explicitly calls for playful bounce.


## Step 6: Visuals That Don't Break

Broken images kill a prototype's credibility instantly. The visual strategy should be decided early, ideally as one of the questions in Step 2.

The priority chain, from best to acceptable:

1. **Designer-provided images** (upload and base64-encode inline). Always the best option. Ask for them.
2. **External photo URLs** (picsum.photos or Unsplash) with a CSS-styled fallback. For when the designer wants realistic photos but doesn't have files.
3. **SVG illustrations** (built with code). When the design calls for an illustrated style, or when you need category-specific visuals (food types, product categories, activity types) that generic photos can't match. Claude can compose SVG scenes from basic shapes: a bowl with noodles, a plate with sushi, a taco with fillings, a sneaker in profile, a plant in a pot. These render crisply at any size, never break, and can match the product's color palette exactly. Think of them as composed scenes, not detailed art. Simplified but intentional. Always better than oversized emoji sitting on a blank card.
4. **CSS-styled placeholder cards** (gradients, Lucide icons, typography compositions). For when the prototype is about the interaction, not the imagery.
5. **Emoji.** Only when the designer explicitly uses emoji as a design element in their screens (like emoji reactions or emoji buttons). Never as a substitute for missing card imagery. Never as the primary visual in a content card.

Every external image must have an `onError` fallback that degrades to a styled placeholder, not a broken icon. Set `draggable={false}` and `pointerEvents: "none"` on all images inside swipeable containers.

For the complete visual strategy with code patterns for each tier, read `references/image-strategies.md`.


## Step 7: Platform Conventions

### iOS (default for most app prototypes)
- **Viewport:** 393px wide, `100dvh`
- **Safe areas:** 54pt top, 34pt bottom
- **Font:** `-apple-system, 'SF Pro Display', system-ui, sans-serif` or the product's specific typeface via Google Fonts
- **Touch targets:** 44x44pt minimum, 8px gap between adjacent targets
- **Tab bar:** 49pt + 34pt safe area = 83pt. Instant switching, no transition
- **Sheets:** Grabber handle (36x5px, centered, rounded). Drag to dismiss at 120px

### Android
- **Viewport:** 412px wide
- **Font:** Roboto, Medium (500) weight
- **Touch feedback:** Opacity 0.7 on press (not scale)

### What makes it feel like an app vs a website
- No hover effects on mobile prototypes. There is no hover on a phone.
- No staggered list entrance animations. Real apps load content instantly.
- Press feedback on every interactive element (`whileTap={{ scale: 0.97 }}` on iOS)
- Content that looks real (localized names, actual prices, plausible data)


## Step 8: Self-Review (MANDATORY, DO NOT SKIP)

**This step is not optional. You do not present the prototype to the designer until you have completed this step in full. No exceptions.**

After the prototype is built and running, you must stop and review your own work as if you were a senior designer opening someone else's prototype for the first time. You are looking for bugs, visual issues, interaction gaps, and anything that feels off. You must write out your findings visibly in the conversation before doing anything else.

**The process has three parts: Audit, Fix, then Present.** You cannot present the prototype until the fix step is complete. If you catch issues in the audit (and you almost always will), you must fix every one of them before the designer ever sees the artifact. The designer should receive a polished prototype, not a first draft with a list of known bugs.

### Part 1: Audit

Walk through every category below and write out what you find. Be specific. Name the element, describe the issue, and say what the fix is. Do not write "looks good" for a category unless you have genuinely inspected it. The categories exist because these are the things that most commonly go wrong.

**Layout and overflow:**
- Does any element extend beyond the viewport edges? Check cards, images, absolutely positioned elements, and anything with fixed pixel widths. A 346px card inside a 393px viewport with 24px padding on each side means the card's max width is 345px. Do the math.
- Is anything clipped that shouldn't be, or unclipped that should be?
- Does the layout work at the target viewport height? Check that content doesn't collide with the action buttons at the bottom.

**Layering during motion:**

Static layout checks aren't enough. Elements that sit cleanly in their own regions at rest can collide when they animate. Rotation extends an element well beyond its resting bounding box. Scale makes it larger. Translation moves it into regions owned by other layers. Effects and particles render on top of everything or behind everything depending on z-index.

- For every element that animates, trace its full range of motion mentally. At maximum displacement, does it overlap anything it shouldn't?
- Persistent UI must stay visually above animated content throughout every phase of every animation, not just at rest. Verify z-index ordering holds at the extremes, not just the defaults.
- Effects and overlays (particles, celebrations, toasts, confirmation chips) need their own layer in the stacking order. Decide where they sit relative to persistent UI and animated content, and verify it.

**Figma chrome contamination:**
- Did you accidentally bring in any borders, colors, or positioning from the Figma file structure rather than the actual UI? Common culprits: artboard border colors (often bright green or blue), frame backgrounds that are canvas-level decoration, annotation markers, device chrome outlines, elements positioned off-screen in Figma that aren't part of the visible design.
- Look at every border and background in your code. Ask: "Does this appear in the screenshot of the design, or only in the Figma code output?" If you can't see it in the screenshot, it doesn't belong in the prototype.

**Visual fidelity to the source:**
- Compare your hex values, border radii, font sizes, font weights, shadows, and spacing against what Figma gave you. Call out anything you approximated or guessed.
- Is the card surface the right color and shadow? Is the background the right shade? Are the progress pips the right size and color?
- Does the typography match? Right font family, right weight, right size, right line height?
- Are the action buttons the right size, shape, and shadow treatment?
- **Color palette re-check.** Go back to the design system you extracted in Step 3. List every color in your code. Does every single one trace back to that extracted list, or to a documented derivation of it? If you find a hex value that doesn't belong to the source palette and wasn't explicitly derived from it, it shouldn't be there. This catches the most common fidelity failure: inventing colors that feel right in isolation but don't belong to the product's visual system.

**Interaction completeness:**
- Does every tappable element have press feedback (`whileTap`)?
- Does the swipe work on every card in the deck, not just the first one?
- Do the action buttons produce the same commit animation and celebration as the gesture path? Tap "I love it" and swipe right should feel identical in their resolution.
- Do the buttons respond reactively during a drag (scaling up, changing color) or are they static bystanders?
- Are there hover effects anywhere? There shouldn't be. This is a mobile prototype.
- **Feedback legibility, not just visibility.** "Is the feedback visible?" is the wrong bar. The right bar is: "Is it legible?" Freeze the interaction at 60% progress. Can you instantly read and understand the directional feedback without squinting? If text or labels are present, are they large enough to read at a glance? Do they have enough contrast against whatever they're overlapping? On dark backgrounds, light-colored feedback elements need shadows, glows, or increased size to actually stand out. Something can technically be rendered on screen and still be invisible to the user because it's too small, too transparent, or too close to the content it's overlapping with.

**Motion quality:**
- Are the spring values matched to the product's emotional register? A playful food app should feel bouncy and fun, not stiff and corporate.
- Does the card exit animation carry the velocity and rotation of the drag, or does it feel canned?
- Does the next card's entrance feel like a promotion from the stack (scaling up from behind) or does it pop in from nowhere?
- Are celebration particles directional (matching the swipe) or generic?
- Is there a reduced motion fallback?
- **Transition sequencing: are exits and entrances choreographed by the animation library, or stitched together with imperative timing?** Using `setTimeout` to delay state changes between an exit and an entrance creates dead frames, race conditions, and sequences that feel stitched together rather than continuous. Let `AnimatePresence` (or equivalent) handle the choreography. The exit and entrance should overlap naturally through the library's lifecycle, not through manual delays. If you find a `setTimeout` controlling when the next piece of content appears, that's a code smell.

**Visual composition:**

For the complete visual composition framework (proximity, breathing room, alignment, weight, spacing rhythm, and the pre-presentation checklist), read `references/visual-composition.md`. At minimum, check these:

- Squint at the screen. Does it feel balanced, or is it top-heavy, lopsided, or sinking?
- Is there enough breathing room between the header, the card area, and the action buttons?
- Do related elements group tightly with clear separation between groups?
- Are spacing values from a consistent scale (4/8/12/16/24/32) or arbitrary?
- Do text blocks, cards, and icons align to shared edges?

**Edge cases:**
- What happens on the last card? Is there a completion state?
- What happens if you swipe very fast? Very slow? Barely past threshold?
- Can you start a new drag while the previous card is still animating out?

### Part 2: Fix

For every issue you found in the audit, fix it now. Edit the code, re-test mentally, and confirm each fix resolves the issue. Do not leave any known bugs for the designer to find. If a fix introduces a new issue, catch it and fix that too.

**After fixing, do one final scan.** Read through the fixed code and make sure nothing new broke. Pay special attention to the things you changed. Edits to layout often affect overflow. Edits to animation timing often affect interaction readiness. Edits to component structure often affect event handling.

### Part 3: Present

Only after the audit is complete and all fixes are applied do you present the prototype. Your response to the designer should include:

1. The working prototype (artifact)
2. A summary of the design decisions you made (what you chose and why, for anything not specified in the source design)
3. Any tradeoffs or limitations worth knowing about
4. Two paths forward: iterate here, or move to Claude Code for deployment

Do not include the raw audit log in your response to the designer. They don't need to see the bugs you caught. They need to see a polished result with clear explanations of your design choices. The audit is your internal QA process, not a deliverable.

**One exception:** if the audit reveals an issue you genuinely cannot fix (a platform limitation, a missing asset, a constraint of the artifact environment), call it out to the designer so they know it's a known limitation and not a bug you missed.


## Step 9: After Presenting

After the prototype is working, offer two paths:

**Iterate here.** "What feels off? I can adjust the motion, the timing, the layout, the content, or any of the interactions."

**Move to Claude Code.** "If you want to take this further with the full Motion library, proper assets, and deploy to a live URL via Vercel, we can move this to Claude Code. That's where the prototype becomes something you can put on someone's phone and test with real users."


## Working With Other Skills

- **ux-motion**: Owns easing curves, timing values, spring physics theory, and motion accessibility. Defer to its easing reference for all curve decisions. This skill owns the interaction patterns and artifact implementation.
- **ux-designer**: Owns flow strategy and interaction design. This skill builds the working prototype of those flows.
- **ui-designer**: Owns visual systems. This skill extracts and implements those visual decisions.
- **frontend-design**: Owns bold web aesthetics. This skill handles app-native feel and platform conventions.
