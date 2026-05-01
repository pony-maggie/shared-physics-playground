# DESIGN.md

## Design Intent

Shared Physics Playground should feel like a precise dark-mode collaboration tool, not a playful marketing site and not a hacker-terminal parody.

The closest inspiration is the **Linear-style** branch of `awesome-design-md`:

- dark-native, not dark-skinned light UI
- highly ordered information hierarchy
- restrained use of accent color
- thin borders, quiet surfaces, dense but legible controls
- product-tool polish rather than decorative creativity

This product still has a playful core, but the play should come from the shared physics world, not from noisy chrome around it.

## Overall Mood

- Calm
- Precise
- High-signal
- Slightly futuristic
- Tool-like rather than app-store-like

The interface should feel like a serious collaborative instrument for experimentation.
Users should trust it at a glance.

## What To Avoid

- Bright rainbow gradients
- Generic startup-landing-page hero styling
- Glassmorphism
- Thick cards with heavy shadows
- Oversized rounded pills everywhere
- Loud neon cyberpunk treatment
- Marketing CTA styling for core controls
- Cute toy-box aesthetics
- Purple-heavy default AI-product look
- Flat white text dumped directly on pure black without hierarchy

## Visual Direction

### Backgrounds

- Use a near-black charcoal background, not pure black.
- Prefer a layered dark stack:
  - page background
  - panel background
  - elevated surface
- The 3D world area should read as the primary stage.
- The surrounding UI should feel like control surfaces orbiting the stage.

Suggested values:

- page background: `#0a0b0d`
- panel background: `#111317`
- elevated surface: `#171a1f`
- subtle hover surface: `#1d2128`

### Borders

- Borders should be thin, low-contrast, and frequent.
- Use borders to structure space instead of relying on card shadows.
- Border color should usually be transparent white or blue-gray low-opacity.

Suggested values:

- subtle border: `rgba(255,255,255,0.08)`
- standard border: `rgba(255,255,255,0.12)`
- strong border: `rgba(255,255,255,0.18)`

### Accent Color

- Use one primary accent only.
- Accent should be cool and precise, not playful.
- Accent is for focus, active state, selected state, and primary action only.

Suggested accent family:

- accent base: `#6f7cff`
- accent hover: `#8892ff`
- accent muted bg: `rgba(111,124,255,0.14)`
- accent ring: `rgba(111,124,255,0.35)`

Do not add a second unrelated brand accent unless there is a strong product reason.

### Text

- Text hierarchy should be driven mostly by luminance and spacing.
- Keep most labels small and quiet.
- Make values and selected state clearer than labels.
- Avoid giant marketing headlines outside of explicit landing pages.

Suggested values:

- primary text: `#f3f5f7`
- secondary text: `#b5bcc8`
- muted text: `#7e8795`
- disabled text: `#5f6671`

## Typography

### Font Families

- Primary UI font: `Inter`
- Monospace font: `IBM Plex Mono`, `Geist Mono`, or `SF Mono` fallback

### Typography Rules

- Headings should be compact, controlled, and slightly tight.
- Body text should stay in the 13px-15px range for most UI copy.
- Metadata and system labels should often be 11px-12px.
- Object ids, room ids, planner/vendor/model labels, and technical values should use monospace selectively.

### Weight Rules

- normal content: `400`
- emphasized UI text: `500`
- section labels or selected values: `600`

Avoid heavy bold usage unless it marks a truly important state.

## Layout Principles

The app should not be one long vertical stack.
It should behave like a real tool.

### Preferred Shell

- top status bar
- left control rail for create and persistence
- center stage for the world
- right inspector for selected object details and non-spatial selection tools

On smaller widths, collapse to:

- top status
- stage
- stacked control panels below

### Spacing

- Use tight but breathable spacing.
- Favor 8px-based rhythm.
- Panels should feel aligned to a grid, not loosely floating.

Suggested scale:

- 4px micro spacing
- 8px tight gaps
- 12px default control gaps
- 16px panel padding minimum
- 24px section spacing

## Components

### Status Bar

The header should feel like a system status strip.
It should present:

- room population
- multiplayer state
- room capacity
- pressure
- planner configured/runtime state
- budget

Use compact grouped items rather than loose paragraphs.

### Buttons

Buttons should feel like commands inside a tool.

- Default buttons: dark surface, subtle border, quiet text
- Primary buttons: accent-tinted fill or accent border
- Destructive buttons: restrained red tint, never bright danger red by default
- Secondary persistence actions should not visually compete with the primary world action

Buttons should have:

- tight vertical padding
- medium corner radius
- visible focus state
- restrained hover lift

Suggested radius:

- controls: `10px`
- larger panel surfaces: `14px`

### Inputs

- Inputs should look embedded into the control system
- dark background
- subtle border
- stronger border/focus ring on interaction
- no oversized input chrome

### Panels

Panels should read as modular control surfaces:

- create panel
- persistence panel
- planner health panel
- selected object inspector

Each panel should have:

- a quiet title
- a clear internal structure
- visually grouped actions
- tighter density than a consumer app

### Inspector

The selected object inspector is the most important panel after the stage.

It should present:

- object identity
- ownership
- position
- rotation
- scale
- impulse data
- non-spatial selection actions

Values should be easier to scan than field names.
Transform values should be aligned and monospace.
Action groups should be separated into:

- stage movement state
- transform values
- force
- destructive action

Position, rotation, and scale should be manipulated from the 3D stage. The inspector should show transform values and keep non-spatial actions such as force, delete, and clearing selection, without duplicating spatial transform buttons.

### Links

- Links should be understated
- Use accent only when they represent actionable navigation
- Share and template links should look like utility links, not marketing links

## Motion

- Motion should be short and deliberate
- No floating, bouncing, or decorative motion
- Favor fades, tiny vertical shifts, and border/background transitions

Suggested timings:

- fast interactions: `120ms`
- panel transitions: `180ms`
- no easing gimmicks

## 3D Stage Treatment

- The 3D area must remain the visual center
- It should occupy the largest, clearest surface in the layout
- Surrounding chrome should frame it, not overwhelm it
- Use a subtle backdrop gradient or vignette behind the stage if needed
- Avoid decorating the stage container with strong borders or glowing effects that compete with the world

## Data And Technical UI

This product has visible technical state: planner mode, room IDs, object IDs, capacity, transform values.

Those elements should feel intentional and elegant, not like debug leftovers.

Rules:

- ids and numeric values can use monospace
- low-importance metadata should be dimmer
- state badges should be compact and squared-off, not bubbly
- planner degradation should be visible, but not visually catastrophic

## Color Semantics

- Neutral: default information
- Accent blue-indigo: active, selected, primary
- Green: success and healthy state only
- Amber: warning or crowding
- Red: destructive or broken state only

Do not use multiple bright semantic colors at once in the same compact region.

## Accessibility

- Maintain strong contrast for primary text
- Preserve keyboard focus visibility
- Do not rely on color alone for planner state, room state, or destructive actions
- Hover and focus states must be distinct

## Implementation Guidance For Agents

- Start by creating design tokens before styling individual screens
- Prefer CSS variables for:
  - colors
  - spacing
  - radius
  - border opacity
  - typography sizes
- Style the shell first, then panels, then controls, then inspector details
- Preserve the existing product structure unless there is a strong usability reason to change it
- When in doubt, choose the more restrained option

## First UI Refactor Priorities

1. Turn the current header text dump into a structured status bar
2. Split the page into left controls, center stage, right inspector
3. Give persistence actions and planner state a proper panel treatment
4. Restyle object selection and inspector values into a denser tool-like layout
5. Introduce a tokenized dark theme before adding any decorative polish
