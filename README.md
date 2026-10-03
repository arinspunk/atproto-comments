# atproto-comments

Web Component for displaying AT Protocol (Bluesky) comments on any website. Drop it in, point it at a Bluesky post, done.

## Install

### CDN (no build step)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/atproto-comments/dist/atproto-comments.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/atproto-comments/dist/index.js"></script>
```

### npm

```bash
npm install atproto-comments
```

```js
import 'atproto-comments';
import 'atproto-comments/style.css';
```

### JSR (Deno)

```ts
import 'jsr:@arinspunk/atproto-comments';
```

## Usage

```html
<atproto-comments
  thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
></atproto-comments>
```

## Attributes

| Attribute | Required | Default | Description |
|---|---|---|---|
| `thread-uri` | Yes | — | AT URI of the anchor post (`at://did/app.bsky.feed.post/rkey`) |
| `appview` | No | `https://public.api.bsky.app` | AppView base URL |
| `lang` | No | `<html lang>` or `"en"` | Language code for UI strings (`en`, `pt`) |
| `max-depth` | No | `6` | Maximum reply depth to load |

## Theming

The component ships with functional defaults (system fonts, neutral colors). Override `--atproto-*` custom properties to match your site:

| Variable | Default | Description |
|---|---|---|
| `--atproto-font-family` | `system-ui, -apple-system, sans-serif` | Font family |
| `--atproto-font-size` | `0.875rem` | Base font size |
| `--atproto-color-text` | `inherit` | Primary text color |
| `--atproto-color-muted` | `oklch(50% 0 0)` | Muted text (handles, timestamps) |
| `--atproto-color-border` | `oklch(85% 0 0)` | Borders and thread lines |
| `--atproto-color-surface` | `oklch(97% 0 0)` | Popover hover background |
| `--atproto-avatar-size` | `2rem` | Avatar width and height |
| `--atproto-avatar-bg` | `oklch(60% 0.1 250)` | Avatar placeholder background |
| `--atproto-avatar-color` | `white` | Avatar placeholder text color |

### Mapping your design tokens

```css
atproto-comments {
  --atproto-font-family: var(--font-ui);
  --atproto-color-text: var(--color-text);
  --atproto-color-muted: var(--color-text-muted);
  --atproto-color-border: var(--color-border);
  --atproto-color-surface: var(--color-surface);
  --atproto-avatar-bg: var(--color-accent);
}
```

All `.atproto-*` classes are also available for full CSS overrides if needed.

## Framework usage

### Astro

```astro
---
const threadUri = `at://${did}/app.bsky.feed.post/${rkey}`;
---
<atproto-comments thread-uri={threadUri}></atproto-comments>
<script>import 'atproto-comments';</script>
```

### Lume / Vento

```html
<atproto-comments
  data-thread-uri="at://{{ atproto.did }}/app.bsky.feed.post/{{ rkey }}"
></atproto-comments>
```

### Next.js (App Router)

The component needs the DOM — wrap it in a client component:

```tsx
// components/AtprotoComments.tsx
'use client';
import { useEffect } from 'react';

export function AtprotoComments({ threadUri }: { threadUri: string }) {
  useEffect(() => { import('atproto-comments'); }, []);
  return <atproto-comments thread-uri={threadUri} />;
}
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  onMount(() => import('atproto-comments'));
  export let threadUri: string;
</script>
<atproto-comments thread-uri={threadUri}></atproto-comments>
```

## Custom element name

```js
import { AtprotoComments } from 'atproto-comments';
customElements.define('my-comments', AtprotoComments);
```

```html
<my-comments thread-uri="at://..."></my-comments>
```

## License

MIT
