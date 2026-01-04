# Implementation Plan - HUD Design Refinement

Refine the global HUD aesthetic based on the restored premium purple/blue gradient and align the accent colors for maximum visual impact and professional contrast.

## Proposed Tweaks
1. **Accent Alignment**: Decide whether to stick with the "University" Lime/Turquoise palette or pivot to the Magenta/Cyan theme from the reference image.
2. **Typography Weight**: Adjust font weights (black vs bold) to ensure "premium" feel without clutter.
3. **Glass Intensity**: Fine-tune the `backdrop-blur` and `bg-white/[0.01]` opacities on widgets to ensure they sit "in" the background rather than "on" it.
4. **Glow Consistency**: Ensure the `hud-card` hover effects and status dots use the same accent color tokens globally.

## User Review Required
> [!IMPORTANT]
> Since you have a design background, which accent pairing do you think works best with this deep purple/blue gradient?
> - **Option A (The University Classic)**: Darkened Neon Lime + Neon Turquoise.
> - **Option B (The Reference Image)**: Neon Magenta + Neon Cyan.
