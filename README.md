# atproto-comments

[![npm](https://img.shields.io/npm/v/atproto-comments)](https://www.npmjs.com/package/atproto-comments)
[![JSR](https://jsr.io/badges/@arinspunk/atproto-comments)](https://jsr.io/@arinspunk/atproto-comments)

A Web Component that shows the replies to an AT Protocol post (Bluesky, Mu, Deer…) as the comment section of any website. No backend, no database, no login for visitors.

<!-- TODO: screenshot and link to a live demo -->

## Quick start

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/atproto-comments@1/dist/atproto-comments.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/atproto-comments@1/dist/index.js"></script>

<atproto-comments
  thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
></atproto-comments>
```

Replace the `thread-uri` with the AT URI of your post ([how to get it](#getting-the-at-uri-of-your-post)). Every reply to that post shows up as a comment.

## How it works

The component **only displays** comments. Visitors write them from their own AT Protocol app.

1. Publish an article on your site.
2. Publish a post that links to it from your AT Protocol account. This is the *anchor post*.
3. Pass the anchor post's AT URI to the component.

When a visitor clicks **Comment** or **Reply**, the component lets them choose the app to reply from (Bluesky, Mu, Deer or any other domain) and opens the post there. It remembers that choice for next time.

Any AT Protocol account works, whichever server (PDS) hosts it. We recommend **[Eurosky](https://eurosky.tech/)**, a PDS hosted in Europe under EU privacy law (GDPR), if data residency matters to you. You can use it with **[Mu](https://mu.social)** or any other AT Protocol app. Bluesky, which runs its own PDS and app at [bsky.app](https://bsky.app), is also a valid option.

### Getting the AT URI of your post

An AT URI has the form `at://<did>/app.bsky.feed.post/<rkey>`. You can build it from the post's web address:

```
https://bsky.app/profile/alice.example.com/post/3l6oveex3ii2l
                         └──── handle ────┘      └── rkey ──┘
```

1. Resolve the handle to a DID:

   ```bash
   curl "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.example.com"
   # {"did":"did:plc:abcd1234..."}
   ```

2. Combine the two:

   ```
   at://did:plc:abcd1234.../app.bsky.feed.post/3l6oveex3ii2l
   ```

Or in JavaScript, for a build script or a CMS:

```js
async function toAtUri(postUrl) {
  const [, handle, rkey] = new URL(postUrl).pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/) ?? [];
  if (!handle) throw new Error('Not a post URL');
  const did = handle.startsWith('did:')
    ? handle
    : (await (await fetch(
        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
      )).json()).did;
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}
```

## Install

### CDN

See [Quick start](#quick-start). `@1` gets every 1.x fix and feature, never a breaking 2.0. Use an exact version (`@1.4.0`) to update only when you choose.

Without `type="module"`, load `dist/index.umd.js` instead. It registers the element the same way:

```html
<script src="https://cdn.jsdelivr.net/npm/atproto-comments@1/dist/index.umd.js"></script>
```

### npm

```bash
npm install atproto-comments
```

```js
import 'atproto-comments';
import 'atproto-comments/style.css';
```

The package includes TypeScript types for `AtprotoComments`, `StringKey` and `UiStrings`.

### JSR (Deno)

```ts
import 'jsr:@arinspunk/atproto-comments@1.4.0';
```

The stylesheet is published alongside the module. Link it from your page, pinning the same version as the import:

```html
<link rel="stylesheet" href="https://jsr.io/@arinspunk/atproto-comments/1.4.0/src/atproto-comments.css">
```

Or, in a static site generator, download it at build time. For example, in Lume:

```ts
site.remoteFile(
  "vendor/atproto-comments.css",
  "https://jsr.io/@arinspunk/atproto-comments/1.4.0/src/atproto-comments.css",
);
site.copy("vendor/atproto-comments.css");
```

### Keep script and stylesheet in sync

Always load the script and the stylesheet from the same version, including self-hosted copies. A release can add classes that only its own stylesheet styles, so updating one without the other may leave parts of the UI unstyled.

If you self-host the module, copy `dist/element.js` next to `dist/index.js`: `index.js` imports it. `dist/index.umd.js` is self-contained.

## Attributes

| Attribute | Required | Default | Description |
|---|---|---|---|
| `thread-uri` | Yes | — | AT URI of the anchor post (`at://did/app.bsky.feed.post/rkey`) |
| `appview` | No | `https://public.api.bsky.app` | AppView base URL the replies are fetched from |
| `lang` | No | `<html lang>`, else `en` | Language tag. Picks the bundled UI strings (`en`, `pt`; other languages fall back to `en`) and formats dates (any BCP 47 tag, e.g. `es-ES`) |
| `strings` | No | — | JSON object overriding UI strings by key. See [UI strings](#ui-strings) |
| `max-depth` | No | `6` | Maximum reply depth to load |

Attributes can change at any time:

- Changing `thread-uri`, `appview` or `max-depth` loads the thread again. The previous thread is removed as soon as the new request starts, and a request still in flight is cancelled.
- Changing `lang` or `strings` re-renders with the replies already loaded, without a new request.
- Moving the element to another place in the page keeps what it shows, without a new request.

Content you put inside the element yourself is kept; the component only replaces what it rendered.

## What is shown

- Replies are listed oldest first, nested up to `max-depth` levels. When a reply has more replies than were loaded, a **View more replies** link appears under it.
- Dates are shown as relative time (`5 m`, `3 d`), and replies more than a year old show the short date in the page's language (`1/2/20` in `en-US`, `02/01/20` in `pt-PT`). The full date and time appear on hover.
- Links, mentions and hashtags in the text are clickable. Mentions and **View more replies** open in the app the visitor chose in the app picker, or on bsky.app if they haven't chosen one. Hashtags open in the chosen app if it is Bluesky, Mu or Deer; with a custom domain they open on bsky.app, since that app may not have hashtag pages.
- The anchor post itself is not shown, only its replies.
- If the post has no replies, does not exist or is blocked, only the **Comment** button is shown. If the replies can't be loaded, an error message appears instead.

### Moderation

Replies are hidden, together with their own replies, when they:

- are blocked or no longer exist;
- were hidden by the thread's author in Bluesky (threadgate `hiddenReplies`);
- carry one of these labels: `!hide`, `!no-promote`, `porn`, `sexual`, `nudity`, `graphic-media`;
- are written by an account that carries one of those labels. Labels on the author's profile record (avatar, banner) don't hide their replies.

If every reply is hidden, only the **Comment** button is shown.

## UI strings

The component bundles English and Portuguese. For any other language, pass your own strings. Only the keys you provide are replaced; the rest come from the bundled dictionary for `lang`, or English.

```html
<atproto-comments
  thread-uri="at://did:plc:xxxx/app.bsky.feed.post/yyyy"
  lang="es-ES"
  strings='{"comment":"Comentar","reply":"Responder","replyTo":"Responder a {name}"}'
></atproto-comments>
```

From PHP (e.g. WordPress), let `wp_json_encode` and `esc_attr` handle quoting:

```php
<atproto-comments
  thread-uri="<?php echo esc_attr( $thread_uri ); ?>"
  strings="<?php echo esc_attr( wp_json_encode( [ 'comment' => __( 'Comment', 'my-textdomain' ) ] ) ); ?>"
></atproto-comments>
```

Or set the `strings` property, which takes priority over the attribute key by key. You can set it before or after the element is inserted. To change the strings later, assign a new object: changing a key of the current object does not update the UI.

```js
const el = document.createElement('atproto-comments');
el.setAttribute('thread-uri', threadUri);
el.strings = { comment: 'Kommentieren', reply: 'Antworten' };
container.append(el);
```

Invalid JSON, unknown keys and non-string values are ignored.

| Key | English default | Notes |
|---|---|---|
| `comment` | `Comment` | Main button |
| `reply` | `Reply` | Button under each reply |
| `replyTo` | `Reply to {name}` | Accessible label of the reply button; `{name}` is the author |
| `otherApp` | `Other app` | Separator in the app picker |
| `inputPlaceholder` | `app.example` | Placeholder of the custom app domain input |
| `go` | `Open` | Accessible name of the `→` button that opens the custom app domain |
| `invalidDomain` | `Invalid domain` | Message shown when the custom app domain is not valid |
| `error` | `Comments couldn't be loaded.` | Load error message |
| `viewMore` | `View more replies` | Link when a reply has unloaded replies; opens in the visitor's chosen app |
| `unknownAuthor` | `Unknown` | Name shown for an author with no display name or handle |
| `now` | `now` | Relative time under one minute |
| `minutes` | `m` | Relative time unit, shown as `5 m` |
| `hours` | `h` | Relative time unit |
| `days` | `d` | Relative time unit |
| `months` | `mo` | Relative time unit |

With JSR, the key types are exported: `import type { StringKey, UiStrings } from 'jsr:@arinspunk/atproto-comments';`

## Theming

The component renders into the light DOM (no Shadow DOM), so your page's CSS applies to it. It ships with functional defaults (system fonts, neutral colors); override the `--atproto-*` custom properties to match your site:

| Variable | Default | Description |
|---|---|---|
| `--atproto-font-family` | `system-ui, -apple-system, sans-serif` | Font family |
| `--atproto-font-size` | `0.875rem` | Base font size |
| `--atproto-color-text` | `inherit` | Primary text color |
| `--atproto-color-muted` | `oklch(50% 0 0)` | Muted text (handles, timestamps, buttons) |
| `--atproto-color-border` | `oklch(85% 0 0)` | Borders and thread lines |
| `--atproto-color-surface` | `oklch(97% 0 0)` | Hover and selected background in the app picker |
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

### Dark mode

The default border and surface colors are meant for light backgrounds. The app picker uses the system colors `Canvas` and `CanvasText`, which follow your page's `color-scheme`. On a dark site, declare `color-scheme` and adjust those two colors:

```css
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; }
  atproto-comments {
    --atproto-color-border: oklch(35% 0 0);
    --atproto-color-surface: oklch(25% 0 0);
  }
}
```

### Loading state

While the replies load, the element has `aria-busy="true"` and the class `atproto-comments--loading`. The component shows no loading text of its own; use the class to show a placeholder if you want one:

```css
atproto-comments.atproto-comments--loading {
  min-height: 6rem;
  background: var(--atproto-color-surface);
}
```

### Markup

For full CSS overrides, this is the structure the component generates:

```html
<atproto-comments class="atproto-comments">   <!-- the class is added on connect; while loading, also
                                                  atproto-comments--loading and aria-busy="true" -->
  <ol class="atproto-comments__list">
    <li>
      <article class="atproto-reply">
        <div class="atproto-reply__avatar-wrap">
          <img class="atproto-reply__avatar">
          <!-- or, without avatar: -->
          <div class="atproto-reply__avatar atproto-reply__avatar--placeholder">AB</div>
        </div>
        <div class="atproto-reply__content">
          <header class="atproto-reply__header">
            <span class="atproto-reply__byline">
              <b class="atproto-reply__author">Name</b>
              <span class="atproto-reply__handle">@handle</span>
            </span>
            <time class="atproto-reply__time">3 d</time>
          </header>
          <p class="atproto-reply__text">…</p>
          <div class="atproto-app-action">…</div>      <!-- Reply button + app picker -->
          <a class="atproto-reply__more">…</a>         <!-- only with unloaded replies -->
        </div>
        <ol class="atproto-reply__replies">
          <li class="atproto-reply__item--last">…</li> <!-- nested replies, same structure -->
        </ol>
      </article>
    </li>
  </ol>

  <div class="atproto-app-action">
    <button class="atproto-app-btn atproto-app-btn--xl">Comment</button>
    <div class="atproto-app-popover">
      <a class="atproto-app-popover__link atproto-app-popover__link--active">Bluesky</a>
      <a class="atproto-app-popover__link">Mu</a>
      <a class="atproto-app-popover__link">Deer</a>
      <div class="atproto-app-popover__separator">Other app</div>
      <div class="atproto-app-popover__custom">
        <input class="atproto-app-popover__input">
        <button class="atproto-app-popover__go" aria-label="Open"><span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>

  <!-- instead of the above, when loading fails: -->
  <div class="atproto-comments__error" role="status">…</div>
</atproto-comments>
```

## Browser support

Works in current versions of Chrome, Edge, Firefox and Safari, and in Safari on iOS 15.4 or later.

| Feature used | Chrome / Edge | Firefox | Safari / iOS | Without it |
|---|---|---|---|---|
| [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) | 114 | 125 | 17 | The component shows the app picker itself (see below) |
| `Intl.Segmenter` | 87 | 125 | 14.1 | Avatar placeholders show one initial instead of two for names in scripts without spaces (Chinese, Japanese, Thai) |
| CSS `:has()` | 105 | 121 | 15.4 | Thread lines between nested replies are not drawn |
| CSS `oklch()` | 111 | 113 | 15.4 | Default colors don't apply; set the `--atproto-*` variables |

Browsers without the Popover API, such as every browser on iOS 16 and older, get the same app picker, shown and hidden by the component. That fallback panel is `position: fixed` with a high `z-index` and carries the extra class `.atproto-app-popover--fallback`. If you style `.atproto-app-popover:popover-open`, style that class too. Unlike the native popover, the fallback panel can be misplaced or covered if an ancestor of the component creates a containing block (`transform`, `filter`) or a stacking context (`z-index`, `opacity`, `isolation`).

## Privacy

- **Requests from the visitor's browser.** Replies are fetched from the AppView set in `appview` (by default `public.api.bsky.app`, run by Bluesky), and avatars are loaded from the URLs it returns (usually `cdn.bsky.app`). Those servers receive the visitor's IP address and user agent, as with any embedded resource. To use a different provider, set `appview`.
- **Local storage.** When a visitor picks an app in the app picker, the component saves its domain in `localStorage` under the key `atproto-preferred-app`. Nothing else is stored, and the component sets no cookies.
- **No tracking.** The component sends no analytics and does not identify visitors. Visitors only log in to their own app, outside your site, when they choose to reply.

Mention these third-party requests in your privacy policy if it lists embedded services.

## Framework usage

Importing the package on the server (server-side rendering) is safe: outside the browser it registers nothing. The element itself renders in the browser.

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
  thread-uri="at://{{ atproto.did }}/app.bsky.feed.post/{{ rkey }}"
></atproto-comments>
```

### Next.js (App Router)

The element renders in the browser, so load it from a client component:

```tsx
// components/AtprotoComments.tsx
'use client';
import { useEffect } from 'react';

export function AtprotoComments({ threadUri }: { threadUri: string }) {
  useEffect(() => { import('atproto-comments'); }, []);
  return <atproto-comments thread-uri={threadUri} />;
}
```

With TypeScript, declare the element once, for example in `custom-elements.d.ts`:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'atproto-comments': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'thread-uri': string;
        appview?: string;
        lang?: string;
        strings?: string;
        'max-depth'?: number;
      };
    }
  }
}
```

### Svelte 5

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  let { threadUri }: { threadUri: string } = $props();
  onMount(() => { import('atproto-comments'); });
</script>

<atproto-comments thread-uri={threadUri}></atproto-comments>
```

## Custom element name

Importing the package registers `<atproto-comments>`. To use another tag name instead, import the class from `atproto-comments/element`, which registers nothing:

```js
import { AtprotoComments } from 'atproto-comments/element';
customElements.define('my-comments', AtprotoComments);
```

With JSR, the same entry point is `jsr:@arinspunk/atproto-comments/element`.

The element adds the class `atproto-comments` to itself, so the stylesheet applies under any tag name. To theme it, use your tag name, for example `my-comments { --atproto-avatar-bg: teal; }`.

To use both tag names, import the package and register a subclass (the same class can't be registered twice):

```js
import { AtprotoComments } from 'atproto-comments';
customElements.define('my-comments', class extends AtprotoComments {});
```

```html
<my-comments thread-uri="at://..."></my-comments>
```

## Development

```bash
npm ci
npm run check            # type check
npm run build            # dist/ (index.js, element.js, index.umd.js, types/, CSS); `deno task build` runs the same
deno task test           # unit tests, without a DOM
npm run check:versions   # package.json, the lockfiles, deno.json and the README pins agree
npm run test:browser     # builds, then runs tests/browser in Chromium and WebKit
```

The browser tests use Playwright. Install its browsers once with `npx --prefix tests/browser playwright-core install chromium webkit`. Run them before releasing a version that changes the component. For browsers they don't cover (Firefox, Safari on a device), `npm run build && node tests/browser/server.mjs` serves pages that report PASS or FAIL.

Changes follow [OpenSpec](https://github.com/Fission-AI/OpenSpec). The current specs are in `openspec/specs/`, and proposed and archived changes are in `openspec/changes/`. Pushing a `v*` tag checks that the tag matches every version above, then publishes the release to JSR and creates a GitHub release. Every release adds its entry to [CHANGELOG.md](CHANGELOG.md).

## License

MIT