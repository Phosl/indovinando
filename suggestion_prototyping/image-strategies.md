# Visual Strategies for Artifact Prototypes

The visuals in a prototype communicate quality before anyone interacts with it. A broken image or a lazy placeholder tells the designer "this isn't real." The right visual strategy makes even a rough prototype feel worth testing.

## Always Ask First

Before choosing any visual approach, ask the designer:

"Do you have images you'd like me to use? Screenshots from your designs, product photos, or brand assets you can upload?"

This should be one of your 2-4 questions in Step 2 of the skill. Not a separate step. Just include it naturally: "Should I use specific images for the cards, or would styled placeholders work for now?"

Three possible answers, three paths:

1. **"Yes, here are my images"** - Best case. Base64-encode and embed inline. Resize to display dimensions first (500px wide is plenty for mobile cards). Keep each under 200KB.

2. **"No images, but I want it to look real"** - Use external photo URLs (Tier 2 below) with fallbacks. Or, if the design has an illustrated style, build SVG illustrations (Tier 3).

3. **"Placeholders are fine for now"** - Use CSS-styled cards (Tier 4 below). These should still look designed, not broken.

**Important: do not default to emoji as card imagery.** Emoji are a design element (like a reaction button or a rating indicator), not a substitute for missing illustrations or photos. If the design shows illustrated food on a card, build a simplified SVG illustration. If it shows photos, use external URLs with fallbacks. Giant emoji sitting on a colored background reads as "I gave up" to any designer reviewing the prototype.


## Tier 1: Designer-Provided Images

The designer uploads files. Encode and embed.

```jsx
const restaurantPhoto = "data:image/webp;base64,UklGR...";

<img
  src={restaurantPhoto}
  alt="Restaurant"
  style={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 12 }}
  draggable={false}
/>
```

This never breaks, loads instantly, and looks exactly like the designer intended. Always the first choice.


## Tier 2: External Photo URLs

When the designer wants realistic photos but doesn't have files to upload.

### picsum.photos (most reliable in artifact sandboxes)

```
https://picsum.photos/seed/{your-seed}/{width}/{height}
```

Seeds produce consistent images across reloads. The images aren't category-specific (you can't request "food"), but they're high quality. Good for restaurant cards, hero images, and background photos where the subject matter is secondary to the layout.

```jsx
<SafeImage
  src="https://picsum.photos/seed/restaurant-hero/500/380"
  alt="Restaurant"
  style={{ width: "100%", height: 280, objectFit: "cover" }}
/>
```

### Unsplash (higher quality, less reliable in sandboxes)

```
https://images.unsplash.com/photo-{id}?w={width}&h={height}&fit=crop
```

Category-specific (actual food photos). Can fail in sandboxed iframe environments. Always pair with a fallback.

**Verified food photo IDs:**
- Pizza: `1565299624946-b28f40a0ae38`
- Curry: `1585937421612-70a008356fbe`
- Sushi: `1579871494447-9811cf80d66c`
- Tacos: `1565299585323-38d6b0865b47`
- Coffee: `1495474472287-4d71bcdd2085`
- Burger: `1568901346375-23c9450c58cd`
- Pasta: `1621996346565-e3dbc646d9a9`
- Salad: `1512621776951-a57141f2eefd`

### The required fallback component

Every external image must use this pattern. Non-negotiable.

```jsx
function SafeImage({ src, alt, style, fallbackLabel, accentColor = "#4fd786" }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <StyledPlaceholder
        label={fallbackLabel || alt}
        accentColor={accentColor}
        style={style}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      draggable={false}
      onPointerDown={e => e.preventDefault()}
      onError={() => setFailed(true)}
    />
  );
}
```

The fallback is a `StyledPlaceholder` (see Tier 3), not a broken image icon, not an emoji, not an empty box.


## Tier 3: SVG Illustrations

When the design calls for an illustrated style, or when you need category-specific visuals that generic photos can't match. Food types, product categories, activity types, profile illustrations. Claude can compose SVG scenes from basic shapes: a bowl with noodles, a plate with sushi pieces, a taco with fillings, a sneaker in profile, a plant in a pot, a coffee cup with steam.

These aren't detailed art. Think of them as composed scenes built from circles, ellipses, rounded rectangles, and paths. A ramen bowl is: a large ellipse for the bowl, wavy paths for noodles, a half-circle for an egg, small circles for scallions, rectangles for chopsticks. Each element gets a fill color pulled from the product's palette or warm food-adjacent tones.

**Why this works better than emoji:** Emoji are fixed-size, can't be color-matched to the product palette, and look like a placeholder someone forgot to replace. SVG illustrations scale crisply, use the product's exact colors, and communicate "this was designed" rather than "we ran out of time."

**When to use over photos:** When the Figma designs use an illustrated style (like the NeoTaste taste profile cards). When all items in a set need visual consistency (6 cuisine categories should feel like they belong together). When the product's visual language is illustrative rather than photographic.

```jsx
// Example: a simplified ramen bowl as inline SVG
function RamenIllustration({ size = 280, palette }) {
  return (
    <svg width={size} height={size} viewBox="0 0 280 280">
      {/* Bowl */}
      <ellipse cx="140" cy="170" rx="120" ry="80" fill={palette.bowl} />
      <ellipse cx="140" cy="160" rx="115" ry="75" fill={palette.broth} />
      {/* Noodles - wavy paths */}
      <path d="M80 160 Q100 145 120 160 Q140 175 160 160" stroke={palette.noodle} strokeWidth="3" fill="none" />
      <path d="M90 170 Q110 155 130 170 Q150 185 170 170" stroke={palette.noodle} strokeWidth="3" fill="none" />
      {/* Egg half */}
      <ellipse cx="100" cy="155" rx="20" ry="15" fill={palette.eggWhite} />
      <circle cx="100" cy="155" r="8" fill={palette.eggYolk} />
      {/* Chopsticks */}
      <rect x="190" y="100" width="4" height="120" rx="2" fill={palette.chopstick} transform="rotate(15, 190, 100)" />
      <rect x="200" y="95" width="4" height="120" rx="2" fill={palette.chopstick} transform="rotate(20, 200, 95)" />
    </svg>
  );
}
```

Keep illustrations to 15-25 SVG elements. More than that and they get unwieldy to maintain. The goal is recognizable, not realistic.


## Tier 4: CSS-Styled Placeholders

When there are no photos and the designer is fine with placeholders. These should look designed and intentional, not like something broke.

Claude is very good at CSS. Gradients, layered backgrounds, border-radius, and composition are deterministic and consistent.

### Pattern A: Gradient card with Lucide icon

Lucide React is available in artifacts. A single icon at a large size, centered over a warm gradient, reads as "designed placeholder" not "missing image."

```jsx
import { UtensilsCrossed, Coffee, Salad, Fish } from "lucide-react";

function StyledPlaceholder({ label, accentColor = "#4fd786", bgColor = "#063c1c", icon: Icon, style }) {
  return (
    <div style={{
      ...style,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      background: `
        radial-gradient(ellipse at 30% 40%, ${accentColor}18 0%, transparent 60%),
        radial-gradient(ellipse at 70% 80%, ${accentColor}10 0%, transparent 50%),
        ${bgColor}
      `,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative background circles (CSS, not SVG) */}
      <div style={{
        position: "absolute", top: "-20%", right: "-10%",
        width: 180, height: 180, borderRadius: "50%",
        background: accentColor, opacity: 0.04,
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", left: "-5%",
        width: 120, height: 120, borderRadius: "50%",
        background: accentColor, opacity: 0.06,
      }} />

      {/* Icon */}
      {Icon && <Icon size={48} color={accentColor} strokeWidth={1.5} style={{ opacity: 0.6 }} />}

      {/* Label */}
      {label && (
        <span style={{
          color: "white", fontSize: 14, fontWeight: 600,
          opacity: 0.7, letterSpacing: 0.5,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
```

### Pattern B: Color block with typography

For products where the content is the focus (cards in a feed, list items), a solid color block with strong typography can be more honest and more useful than a fake photo.

```jsx
function TypePlaceholder({ label, accentColor, style }) {
  return (
    <div style={{
      ...style,
      display: "flex",
      alignItems: "flex-end",
      padding: 20,
      background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
      borderBottom: `3px solid ${accentColor}30`,
    }}>
      <span style={{
        color: accentColor, fontSize: 28, fontWeight: 700,
        opacity: 0.35, lineHeight: 1.1,
      }}>
        {label}
      </span>
    </div>
  );
}
```

### Pattern C: Skeleton / content placeholder

When the prototype is about the interaction pattern and the images are truly irrelevant to the demo, use a skeleton-style placeholder. This communicates "image goes here" without pretending to be something it's not.

```jsx
function SkeletonImage({ style }) {
  return (
    <div style={{
      ...style,
      background: "linear-gradient(110deg, rgba(0,0,0,0.06) 30%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.06) 70%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: style?.borderRadius || 8,
    }} />
  );
}

// Add to your CSS:
// @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```


## Choosing the Right Tier

| Situation | Use | Why |
|---|---|---|
| Designer has photos or screenshots | Tier 1 (base64) | Authentic, never breaks |
| Prototype needs to feel "real" (user testing, stakeholder demo) | Tier 2 (external URLs) + Tier 4 fallback | Photos add credibility, fallback prevents embarrassment |
| Design uses illustrated style, or needs category-specific visuals | Tier 3 (SVG illustrations) | Matches the design language, scales crisply, never breaks |
| Prototype is about the interaction pattern, not the imagery | Tier 4 Pattern A or B | Looks designed, focuses attention on the interaction |
| Very early exploration, layout testing | Tier 4 Pattern C (skeleton) | Honest about what it is |
| Designer explicitly uses emoji as a design element | Emoji in the specific context | Only when emoji IS the design choice (reactions, buttons), never as card imagery |


## Never

- **Never use Figma export URLs.** They expire in ~7 days.
- **Never use localhost URLs from MCP.** They only work during the session.
- **Never use base64 images over 200KB.** They bloat the artifact.
- **Never leave an `<img>` without an `onError` fallback.** One broken image kills the prototype's credibility.
- **Never default to emoji as the first option.** Ask the designer what they want. Offer real alternatives.


## Images Inside Draggable Containers

When images are inside swipeable cards, carousels, or any draggable container:

1. `draggable={false}` on the `<img>` (prevents browser's native image drag)
2. `pointerEvents: "none"` in the style (prevents the image from stealing touch events)
3. `onPointerDown={e => e.preventDefault()}` as extra safety

Without these, the browser's native image drag fights with your gesture and the card sticks or stutters.
