# ADR-003: Luxury/Editorial Design System vs. In-Call Utility Balance

## Status
**Accepted**

## Context
Standard enterprise meeting platforms often default to generic, uninspired blue-and-grey palettes or identical SaaS layouts. The user specified a **Luxury/Editorial design system** (Playfair Display + Inter, warm alabaster/charcoal/gold palette, crisp 0px geometric borders, slow cinematic transitions, asymmetric grids) for the surrounding pages.

However, applying heavy 1500ms transitions or low-contrast editorial treatments inside the live in-call screen would severely degrade usability, latency, and accessibility during active calls.

## Decision
We implemented a **Dual-Mode Visual Philosophy**:
1. **Surrounding UI (Editorial Luxury)**:
   - Pages: Landing page, Pre-join lobby, Dashboard, Meeting history, and Post-meeting summary/mind map viewer.
   - Elements: Playfair Display serif headers, gold accents, crisp 0px card borders, warm alabaster/charcoal backgrounds, and slow cinematic transitions.
2. **In-Call UI (High-Speed Utility)**:
   - Elements: Google Meet-style high-contrast controls, zero-lag micro-interactions, minimum 44px touch targets on mobile, and an auto-reflowing CSS Grid that resizes without layout-thrashing when side panels are toggled.

## Consequences & Trade-offs
### Positive
- **Brand Differentiation**: Offers an exclusive, high-end editorial feel on public and executive dashboard pages.
- **Flawless Usability**: Preserves instantaneous, accessible, zero-distraction control during live video conferences.
