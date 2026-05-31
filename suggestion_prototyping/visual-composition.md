# Visual Composition for Prototypes

A prototype that works perfectly but looks unfinished undermines the designer's confidence in the concept. Visual composition is what makes a prototype feel designed rather than assembled. These principles apply after the interaction layer is built, as a quality pass before presenting.

The goal is not pixel-perfection. It's making sure nothing feels accidentally placed.


## Proximity: closeness is meaning

The most fundamental rule in visual design is also the most frequently broken in prototypes: **things that are related should be close together, and things that aren't should be clearly separated.**

When a restaurant name, its rating, and its distance are all spaced equally apart from each other AND from the next card, the eye can't tell what belongs to what. The information is flat. But when the name, rating, and distance sit tight as a group with generous space before the next card starts, the structure is instantly clear.

**How to check proximity in your prototype:**

Look at every cluster of information on screen. Can you draw a rectangle around the things that belong together, with clear air between that rectangle and the next group? If two groups blur into each other, tighten the items within each group and increase the gap between groups.

Typical ratios that work: the space between items inside a group should be roughly 1/3 to 1/2 of the space between groups. If elements within a card are 8px apart, the cards themselves should be 16-24px apart. If section content uses 12px internal spacing, the gap between sections should be 24-32px.

**Common prototype mistakes:**

- Padding inside a card matches the gap between cards (everything reads as one flat list)
- A label sits equidistant between the element it describes and the element above (it floats, belonging to neither)
- Action buttons are too far from the content they act on (the connection between "Book deal" and the deal it refers to is broken)


## Breathing room: let the layout exhale

Cramped layouts make users feel anxious. They create visual noise even when the content is simple. The fix is usually not removing elements but adding space around them.

**Where breathing room matters most:**

- **Screen edges.** Content should never touch the sides of the viewport. 16-24px horizontal padding is the minimum on mobile. 20px is the sweet spot for most app prototypes.
- **Between sections.** When a screen has distinct sections (a header area, a card area, an action area), the gaps between them should be generous enough that each section reads as its own zone. 24-40px between major sections.
- **Inside cards.** Card padding should be large enough that the content doesn't feel trapped inside its container. 12-16px minimum, and consistent on all sides unless the design intentionally bleeds an image to the edge.
- **Around primary actions.** CTAs (buttons, swipe areas) need clear space so they feel important and tappable, not squeezed. 16-24px clear space around a primary button.

**The squint test:** Blur your eyes or step back from the screen. The layout should still read as organized blocks with clear channels of space between them. If it looks like a wall of stuff, spacing needs work.

**But don't over-space either.** Too much breathing room between related elements makes them feel disconnected. A label 32px above its input field feels orphaned. A subtitle 20px below its title feels like a separate element. Keep related pairs tight (4-8px) and let the generous spacing live between groups.


## Alignment: the invisible grid

Misaligned elements are one of the fastest ways to make a prototype feel unfinished. The eye is remarkably sensitive to things being slightly off, even when someone can't articulate what's wrong.

**The rule:** Every element on screen should align to at least one other element. Text aligns to text. Card edges align to card edges. Icons align to a shared vertical center. Nothing floats at an arbitrary position.

**Practical checks:**

- Do all text elements on the left side share the same left edge? If a title starts at 24px and the body text below it starts at 26px, that 2px difference reads as sloppy.
- Do cards in a list share exactly the same width and horizontal position?
- Are icons vertically centered with their adjacent text, or sitting slightly high or low?
- When elements are centered, are they truly centered? Optical centering sometimes differs from mathematical centering (a play icon inside a circle, for example, needs to shift slightly right to look centered).

**Alignment across sections:** Even when sections have different content, maintaining a shared left margin across the entire screen creates a vertical rhythm that holds the layout together. If section A starts its content at 24px and section B starts at 20px, the break in alignment makes the screen feel like two different designs stitched together.


## Visual weight and balance

Every element on screen has visual weight. Dark colors are heavier than light ones. Large elements are heavier than small ones. Images are heavier than text. Bold text is heavier than regular text. Filled shapes are heavier than outlined ones.

**A well-balanced screen distributes weight so it doesn't feel like it's tipping to one side or sinking to the bottom.**

This doesn't mean everything needs to be symmetrical. Asymmetric layouts can feel balanced when a heavy element on one side is counterweighted by whitespace or a cluster of lighter elements on the other.

**Common weight problems in prototypes:**

- A large image or card at the top with tiny text below makes the screen feel top-heavy. Add visual weight below (a solid button, a colored section, bolder typography) to anchor the bottom.
- All the action (color, imagery, interaction) is in the center, with empty corners. The edges feel abandoned.
- One section is visually dense (lots of elements, colors, detail) right next to a section that's nearly empty. The contrast feels accidental rather than intentional.


## Consistent spacing rhythm

Pick a spacing scale and use it everywhere. The specific values matter less than the consistency.

**A simple scale that works for most mobile prototypes:**

4px (micro gaps, like space between an icon and its label)
8px (tight spacing within a component, like between a name and a subtitle)
12px (comfortable internal padding, like inside badges or chips)
16px (standard padding, like card interiors or between list items)
24px (section gaps, like between a title and the content below)
32px (major section breaks)
48px (screen-level zones, like between the header and the main content area)

**The test:** If you search your code for spacing values and find 5, 7, 9, 11, 13, 15, 17, 19, 22, 27, 35... the spacing isn't following a scale. It's arbitrary. Each value is probably close to a round number but slightly off, and those inconsistencies accumulate into a layout that feels noisy.

You don't have to use an 8px grid rigidly. But every spacing value should be a deliberate choice from your scale, not a guess.


## The pre-presentation visual check

Before showing the prototype, run through these questions. They take 30 seconds and catch the most common issues:

1. **Proximity:** Is there any place where a label or element is ambiguous about what it belongs to? Tighten the group or widen the gap.

2. **Breathing room:** Does anything feel cramped against an edge, a neighbor, or its own container? Add padding. Does anything feel marooned with too much space around it? Pull it closer to its group.

3. **Alignment:** Pick any vertical line on the left side of the screen. Do all the elements that should share that edge actually share it? Repeat for the right side and for any centered content.

4. **Weight:** Squint at the screen. Does it feel balanced, or does one area pull your eye and leave the rest feeling empty? Redistribute weight with spacing, color, or element sizing.

5. **Rhythm:** Are the spacing values between similar elements consistent? If three cards are in a list, is the gap between card 1-2 the same as between card 2-3?

6. **Content density:** Does the screen feel appropriate for the platform? Mobile screens should feel focused, not packed. If you're scrolling through a mental list of "this could go," the screen probably has too much. If it feels barren, you may need to increase font sizes or add supporting information rather than adding more elements.

None of these need to be perfect. But each one should be intentional. The difference between "this spacing is 12px because it's part of the 4-8-12-16 scale" and "this spacing is 13px because that's where it landed" is the difference between designed and assembled.
