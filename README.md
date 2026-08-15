# Comment Sort

Comment Sort is a Figma plugin + web app that turns comment threads into structured output (table, sticky notes, CSV).

## Core behavior

- Users authenticate on the web app and save:
  - required: Figma personal access token (PAT)
  - optional: model provider key (`openai`, `gemini`, or `anthropic`)
- Plugin users paste a one-time `fc_` plugin token.
- In the plugin, users paste a Figma file URL and choose a sort method:
  - `Keywords` (default): heuristic classification, no model key required
  - `AI`: provider-backed classification with BYOK billing

## Security and privacy model

- Plugin token is stored in Figma `clientStorage`.
- Backend stores only encrypted secrets (`user_secrets`) and token hashes (`plugin_tokens`).
- In AI mode, comments are redacted before provider calls:
  - emails
  - phone numbers
  - URLs
  - author names
- Full comments are not persisted by the app database.
- Operational logs follow active Vercel-plan retention.

## Community listing copy

### Short description
Sort Figma comments into actionable feedback with keyword or optional AI classification.

### Long description
Comment Sort helps teams review design feedback faster by grouping Figma comments into a clear structure. Paste your file URL, choose Keywords or AI, and render a table, sticky notes, or CSV in seconds.

Keywords mode is the default and requires only your Figma PAT. AI mode is optional and supports OpenAI, Gemini, and Anthropic using your own provider key and billing account.

### Category
`Design tools`

### Setup disclosure
- Requires a Comment Sort account and confirmed email
- Requires Figma PAT
- Optional model key for AI mode
- Plugin token required in Figma

## Security disclosure paste copy

- **What data leaves Figma?** Comment text and author names from the file URL the user provides.
- **Where does it go?** Comment Sort backend (`comment-sort.vercel.app`).
- **Third-party processors?**
  - Keywords mode: none.
  - AI mode: selected provider (OpenAI, Google Gemini, or Anthropic) with user-supplied key.
- **PII handling:** emails, phone numbers, URLs, and author names are tokenized before AI provider calls.
- **Storage:** encrypted Figma/LLM credentials + plugin token hash metadata only.
- **Deletion:** account deletion removes profile, secrets, and plugin tokens.
- **Support:** [GitHub Issues](https://github.com/hferello/figcomment/issues)

## Manifest ID note (Figma requirement)

Keep the current manifest `id` during local development. For Community publish, create/publish through Figma so Figma assigns the canonical plugin ID.
