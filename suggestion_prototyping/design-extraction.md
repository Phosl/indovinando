# Design Extraction Reference

How to accurately read designs from different sources and identify what's missing before building.

## Extraction by Source Type

### From Figma URLs (best case)

Call `get_design_context` with the file key and node ID extracted from the URL. This returns exact values for everything. Cross-reference the returned code against the screenshot to catch any elements the code generator missed (badges, overlays, decorative elements sometimes get lost).

After extraction, check:
- Are all screens accounted for? (default state, active state, error state, empty state)
- Are there components referenced in the design that suggest states you don't have? (a "loading" variant, a "disabled" variant)
- Does the design use a consistent spacing system? (note the base unit: 4px, 8px, etc.)

### From Screenshots (common case)

When designers don't have Figma MCP connected, screenshots are the primary source. Extract values systematically in this order:

**1. Colors (most impactful if wrong)**
- Background color of the screen
- Card/surface colors
- Primary text color
- Secondary/muted text color
- Accent/brand color (buttons, badges, active states)
- Any gradients or overlay colors

**2. Typography**
- Font family (look at letter shapes: Poppins has round, geometric forms; SF Pro has humanist proportions; Inter is neutral and wide)
- Heading size and weight
- Body text size
- Caption/small text size
- Line height (tight headings, relaxed body)

**3. Spacing and layout**
- Horizontal padding from screen edge
- Vertical spacing between sections
- Internal padding of cards and containers
- Gap between list items
- The spacing grid (most apps use 8px increments)

**4. Components**
- Border radius on cards, buttons, inputs, avatars
- Shadow depth and spread on elevated elements
- Button height, border radius, and text style
- Badge/pill style (border radius, padding, font size)
- Avatar size and border treatment
- Icon size and stroke weight

**5. Decorative details**
- Inner shadows (common on iOS-style buttons)
- Border colors and widths
- Progress indicator styles
- Separator/divider treatments

Write these out as a visible spec block in your response. The designer will catch errors here that would have taken a full rebuild to discover later.

### From Verbal Descriptions

When there are no visuals at all, ask for:
1. A reference app that captures the feel they want ("it should feel like Duolingo" or "clean like Linear")
2. Dark or light UI
3. The accent color (or brand color)
4. Playful or serious
5. Dense with information or spacious

Then build a first version using those cues, and expect one round of visual refinement.


## Spotting UX Gaps (and Proposing Solutions)

These are the states and interactions that designers commonly leave out of their deliverables but are essential for a prototype that feels complete. When you spot a gap, don't just flag it. Think about what the most likely answer is based on context, and propose it. If you're not confident, include it as a question with your best guess as the default option.

### Transitional States

**Mid-gesture feedback.** If the prototype involves dragging or swiping, what does the user see at 50% progress? Does the card tilt? Does a badge appear? Does the background shift? If the designs don't show this, ask. The mid-gesture state is often what makes the interaction feel alive.

**Loading/skeleton states.** If the prototype fetches data or transitions between views, what shows during the brief moment before content appears? A skeleton screen, a spinner, or does content just pop in? For most prototypes, content can appear instantly. But if the flow involves a deliberate wait (like "finding restaurants near you"), a loading state matters.

**Transition between screens.** Does the next screen slide in from the right? Fade up from the bottom? Replace instantly? If the designs show two screens but don't indicate how you get from one to the other, ask. The transition communicates the spatial relationship between screens.

### Edge Cases

**Empty state (zero data).** "What does this screen look like when there are no items?" This is especially important for social features (zero friends), lists (no results), and history views (no past activity). Empty states need both a visual treatment and usually a call to action.

**Completion state.** "What happens after the user finishes?" For flows with a clear end (onboarding, a survey, a card deck), what does the done state look like? Is there a summary? A celebration? A redirect?

**Error recovery.** "What if something goes wrong?" For prototypes involving forms, submissions, or network-dependent features, how does the app communicate failure? A shake animation on the form? An inline error? A toast? Most design prototypes skip this, but it matters for credibility during testing.

### Content Realism

**Data density.** How many items should a list show? A long list of 20+ items feels different from a curated set of 3-5. Ask what's representative.

**Locale and language.** Should restaurant names be in German or English? Should prices be in euros or pounds? Currency symbols, date formats, and naming conventions signal whether the prototype feels like it belongs in the real product.

**Photo availability.** Are photos essential to the concept or can the prototype work without them? If the design relies heavily on food photography, that needs to be addressed in the image strategy. If the concept works with icons or text, that simplifies everything.

### Navigation Context

**Where does this screen live?** Is it a standalone flow (onboarding), part of a tab structure (a tab in the main app), or a modal overlay? This determines whether you need a tab bar, a navigation header, a close button, or all three.

**Entry point.** What did the user do to arrive at this screen? If they tapped a button, the screen should feel like it came from somewhere (slide up, fade in). If it's the first screen in the app, it should feel like a beginning.

**Exit options.** Can the user go back? Dismiss? Skip? If the designs show a close button, great. If they don't, ask whether the flow is mandatory or dismissible.


## The Design Spec Format

When writing out your extracted values, use this format so the designer can scan it quickly:

```
Design spec (from screenshots):

Colors:
  Background: #0a2817
  Cards: #063c1c
  Text primary: #f5fdf9
  Text secondary: #f5fdf9 at 60% opacity
  Accent: #4fd786
  Button bg: #fff with inner shadow

Typography:
  Font: Poppins (SemiBold 600 for headings, Regular 400 for body)
  Heading: 24px / 22px line-height
  Body: 16px / 22px line-height
  Label: 16px SemiBold, accent color

Spacing:
  Screen padding: 26px horizontal
  Card padding: 8px outer, 11px/15px inner text
  Section gap: 12px
  Base unit: appears to be 8px

Components:
  Cards: 346px wide, 400px tall, 20px radius, drop-shadow
  Buttons: 75px circles, white bg, inner shadow top + bottom
  Progress pips: 5px tall, rounded, green active / dark green inactive
  Close icon: 32px, top-right corner

Let me know if any of these are off before I start building.
```

This takes 2 minutes to write and saves 20 minutes of "that color is wrong" iterations.
