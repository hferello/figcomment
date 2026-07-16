# Figma Comment Intelligence Demo

This plugin turns unstructured Figma comments into a structured feedback table on the canvas.

## What the plugin does

- Reads comments from the active Figma file.
- Uses AI to classify each comment into:
  - `type`: `Comment`, `Suggestion`, `Action`, or `Idea`
  - `critique_lens`:
    - `Low - Visual design`
    - `Low - Interaction design`
    - `Medium - Flow and information design`
    - `High - Underlying model, business rules and logic`
    - `High - User need/problem`
    - `High - Business opportunity/problem`
- Renders all classified comments into a clear table directly in Figma.
- Selects and zooms to the generated table so teams can review immediately.

## Why it is useful

- Converts scattered comment threads into a single review artifact.
- Makes it easier to prioritize by critique depth (low/medium/high).
- Helps designers and product teams separate UI polish feedback from deeper product/system concerns.
