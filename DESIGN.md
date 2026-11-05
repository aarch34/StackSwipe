# StackSwipe design system: Player Select

## Concept card
- **Idea:** networking as an 8-bit arcade character select.
- **Metaphor:** an arcade cabinet printed on grid paper.
- **Signature:** a profile card you can drag, which breaks into chunky pixels when it is swiped.
- **Emotion:** playful and quick, the first 3 seconds feel like pressing start.
- **Motion rule:** what you touch stays perfectly smooth. What plays by itself snaps in frames with `steps()`.
- **Screenshot:** pink hero with a giant pixel headline and a card mid-swipe.

## Anchors in the product
| Product fact | Expression |
|---|---|
| 10 swipes a day | 10 coins that spend one by one |
| Tech stack | Inventory tiles |
| "It's a Handshake!" match | Two pixel hands snap together in frames |
| Undo | A rewind flicker |
| Mascot | Stacky, a creature made of stacked cards |

## Palette
| Role | Light | Night |
|---|---|---|
| Ground | `#FFF5EA` | `#21121A` |
| Card | `#FFFBF5` | `#321C27` |
| Soft panel | `#FCE4D6` | `#3F2A33` |
| Ink | `#3F2029` | `#FFF4E8` |
| Muted text | `#6F4C55` | `#D2B7B5` |
| Primary | `#FF7A9A` with ink text | same |
| Accent | `#FFD83F` with ink text | same |
| Danger | `#C93A14` with white text | same |
| Violet | `#7A56BD` with white text | same |
| Orange | `#F2572B` with ink text, large only | same |
| Leaf | `#2FB84A` with ink text | same |

Pink is never used for text on cream (2.29:1). Focus ring is violet in light and butter at night.

## Type
- **Handjet:** headings and button labels.
- **Silkscreen:** short labels we write ourselves. Never user content, because it has no lowercase.
- **Space Grotesk:** everything people read: body, chat, forms, tables.

## Shape
No radius. `.px-box` draws a notched outline with stacked `box-shadow`. `.px-raised` adds a hard offset shadow controlled by `--lift`. No blur, glass or smooth gradients.

## Motion
- Touch: smooth transforms, `cubic-bezier(.2,.9,.3,1)`, 80 to 220 ms.
- Self-playing: `steps()`, sprite frames 120 to 200 ms.
- Only `transform`, `opacity` and `clip-path`. All of it stops under reduced motion.
- GSAP and Lenis are for the landing page only. The app uses CSS and small pointer code.

## Admin
Same tokens forced to night, pixel headings, no sprites or curtains. Tables stay in Space Grotesk.

## Voice
- Welcoming and plain. A beginner should feel as at home as someone with 15 years of experience.
- Everyone can both teach and learn, so avoid mentor and mentee labels.
- Never imply that anyone owes a reply, and never make a credential sound required.
- Reminders such as "Everyone starts somewhere" appear once per screen at most.
