# Figcomment

This plugin turns unstructured Figma comments into a structured feedback table on the canvas.

## What the plugin does

- Reads comments from the active Figma file.
- Uses AI to classify each comment into:
  - `type`: `Thoughts`, `Suggestion`, `Action`, or `Idea`
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

## Public use (authenticated)

1. Sign up on the web app and confirm your email.
2. On `/profile`, save your Figma personal access token and Anthropic API key.
3. Mint your plugin token on `/profile` and copy it (shown once).
4. In Figma, open the Figcomment plugin and paste the token on the Connect screen.
5. Choose Table, Sticky notes, or CSV to analyse comments in the active file.

The plugin stores your token locally in Figma (`clientStorage`). Classify requests send `Authorization: Bearer fc_…` to the backend. For local development, run `npm run dev` in `/backend` and use the plugin from **Plugins → Development**.

Optional: override the backend URL on the Connect screen when testing against another deployment (defaults to `http://localhost:3000/api/classify`).
