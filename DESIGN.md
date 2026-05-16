# DESIGN.md

## Visual Direction

Album Trader Chile uses a bold Chilean sports identity: dark blue, energetic red, strong contrast, and clean sticker/card UI patterns.

The product should feel:

- Chilean.
- Football-season ready.
- Fast and practical.
- Trustworthy for coordinating exchanges.
- Modern enough for a portfolio project.

Avoid official Panini, FIFA, World Cup, or protected brand assets. The visual identity should suggest album collecting and football culture without copying official tournament branding.

## Core Concept

Use the idea of:

- Stickers.
- Albums.
- Match cards.
- Chilean red/blue contrast.
- Diagonal graphic shapes inspired by sports graphics.
- Realtime activity and trading compatibility.

The UI should not look like a generic SaaS dashboard. It should feel like a collector app built for the Chilean football album season.

## Color Palette

Primary colors:

- Night blue: `#0B1739`
- Chile red: `#D90429`
- White: `#FFFFFF`

Accent colors:

- Light blue: `#93C5FD`
- Soft blue: `#DBEAFE`
- Success green: `#16A34A`
- Featured gold: `#F59E0B`

Text colors:

- Text on dark: `#FFFFFF`
- Muted text on dark: `rgba(255, 255, 255, 0.72)`
- Muted text on light: `#64748B`
- Dark text: `#0F172A`

Surface colors:

- Dark surface: `rgba(255, 255, 255, 0.10)`
- Dark surface border: `rgba(255, 255, 255, 0.18)`
- Light surface: `#F8FAFC`
- Light border: `#CBD5E1`

## Background Style

Primary public pages should use a dark blue base.

Recommended background:

- Base: `#0B1739`.
- Red diagonal block: `#D90429`.
- Thin white diagonal separator.
- Subtle radial glow in white or blue.

Example CSS direction:

```css
background:
  radial-gradient(circle at 86% 17%, rgba(255, 255, 255, 0.18), transparent 12rem),
  linear-gradient(140deg, transparent 0 45%, #d90429 45% 65%, #ffffff 65% 69%, transparent 69% 100%),
  #0b1739;
```

Use this style carefully. Internal app screens can be calmer and more functional while keeping the same color system.

## Typography

Preferred approach:

- Use system fonts first for speed and simplicity.
- If adding a hosted font later, use one display font for headings and one UI font for body.

Recommended stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Heading style:

- Bold or black weight.
- Tight line-height.
- Slight negative letter spacing.

Body style:

- Clear and readable.
- Avoid tiny text on mobile.
- Prefer high contrast.

## Logo Direction

Use a simple `AT` monogram inside a sticker-like shape.

Logo style:

- White background.
- Red letters.
- Slight rotation, around `-8deg`.
- Red drop shadow or offset block.
- Rounded square shape.

Do not use official balls, trophies, FIFA marks, Panini marks, album covers, or copyrighted sticker artwork.

## Component Style

Cards:

- Rounded corners: `24px` to `32px`.
- Dark translucent surface on hero/dashboard dark sections.
- Soft border: `rgba(255, 255, 255, 0.18)`.
- Optional backdrop blur for premium feel.

Buttons:

- Primary button on dark background: white button with dark text.
- Secondary button: transparent with subtle white border.
- Use pill shape for main CTAs.
- Minimum touch height: `44px`.

Badges:

- Use pill shapes.
- Use strong colors and short labels.
- Labels should be easy to scan in Spanish Latino.

Sticker cards:

- Should feel like collectible items.
- Use stable sticker IDs prominently.
- Show status clearly: owned, duplicate, wanted, matched.
- Avoid using copyrighted sticker images for MVP.

Match cards:

- Must emphasize compatibility.
- Show what the other user can offer.
- Show what the current user can offer.
- Contact buttons only appear when there is a match.

## State Colors

Use these defaults unless a screen needs a clearer accessibility contrast:

- Owned: light blue or white on dark blue.
- Duplicate: red.
- Wanted: light blue.
- Match: red for strong visibility, green when communicating success/completion.
- Featured: gold.
- Disabled/unavailable: muted gray or low-opacity white.

Suggested labels:

- `La tienes`
- `Repetida`
- `Buscada`
- `Match`
- `Destacado`

## UI Copy Tone

UI copy must be Spanish Latino.

Tone:

- Direct.
- Friendly.
- Practical.
- Collector-focused.
- Not overly formal.

Good examples:

- `Busca, ofrece y encuentra matches en Chile.`
- `Completa tu álbum con otros coleccionistas.`
- `Tus contactos solo se muestran cuando hay match.`
- `Registra tus repetidas y encuentra quién las necesita.`
- `Coordina el intercambio por WhatsApp o Instagram.`

Avoid:

- Claims of official affiliation.
- Overpromising safety.
- Words like `oficial`, `FIFA oficial`, `Panini oficial`, or similar.

## Responsive Rules

Build mobile-first.

Mobile:

- Large tap targets.
- Simple vertical layout.
- Sticky or easy-to-access primary actions when useful.
- Avoid dense tables.

Tablet:

- Two-column layouts are acceptable for dashboards and match details.
- Keep forms readable and not too wide.

Desktop:

- Use wider dashboards.
- Use cards and panels instead of full-width tables where practical.
- Keep the landing visually bold with strong hero composition.

## Accessibility

- Maintain high contrast, especially on dark blue backgrounds.
- Do not rely only on color to communicate sticker status.
- Use visible focus states.
- Keep button text clear and descriptive.
- Use semantic HTML for forms, navigation, and sections.

## Public Page Direction

Landing page hero should use the strongest version of the identity.

Recommended hero copy:

```txt
Busca, ofrece y encuentra matches en Chile.
```

Recommended supporting copy:

```txt
Registra las láminas que tienes, tus repetidas y las que buscas. Album Trader Chile encuentra coleccionistas compatibles para que coordinen el intercambio por WhatsApp o Instagram.
```

Recommended CTA:

```txt
Entrar con Google
```

Secondary CTA:

```txt
Ver cómo funciona
```

## App Screen Direction

Internal screens should stay practical and fast.

Recommended navigation labels:

- `Inicio`
- `Mi álbum`
- `Repetidas`
- `Buscadas`
- `Matches`
- `Perfil`

Recommended sections:

- `Resumen de tu álbum`
- `Tus matches`
- `Láminas que buscas`
- `Láminas repetidas`
- `Coleccionistas compatibles`

## Legal And Brand Safety

Include this disclaimer in public legal/about content when relevant:

`Album Trader Chile is an independent project and is not affiliated with Panini, FIFA, or related brands.`

Public UI may reference generic football album collecting, but should avoid official brand names in marketing-heavy areas unless necessary for user clarity and legally safe context.

## Implementation Notes

- Keep design tokens centralized once Tailwind is configured.
- Prefer reusable primitives for buttons, cards, badges, and sticker status labels.
- Avoid adding large design dependencies.
- Do not introduce external image assets unless they are original, licensed, or generated specifically for this project.
- Keep initial icons simple and brand-safe.
