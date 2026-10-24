# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/): new attributes, properties, `strings` keys, CSS custom properties or classes are minor releases.

## [Unreleased]

### Added

- `atproto-comments/element` (JSR: `jsr:@arinspunk/atproto-comments/element`) exports `AtprotoComments` and its types without registering any tag. Use it to register the element under another name only.
- The npm package includes TypeScript types for both entry points.
- Importing the package outside the browser (server-side rendering) no longer throws: it registers nothing.

### Changed

- The `require` condition is removed from `exports`. It pointed to `dist/index.umd.js`, which is not CommonJS, so `require('atproto-comments')` returned an empty object. Use `import 'atproto-comments'`, or load `dist/index.umd.js` with a classic `<script>`, which still works as before.
- `dist/index.js` now imports the class from `dist/element.js`, so serve or copy both files together.

## [1.2.0] - 2026-10-24

### Changed

- Attributes and the `strings` property now apply when they change after the element is inserted. Changing `thread-uri`, `appview` or `max-depth` loads the thread again; changing `lang` or `strings` re-renders without a new request. Before, they were read once, when the element connected.
- The `strings` property can be set before or after the element is inserted. Assign a new object to change it: changing a key of the current object does not update the UI.
- Each render replaces only what the component rendered before. Content you put inside the element is kept.
- When `thread-uri` changes, the previous thread is removed as soon as the new request starts, so its buttons no longer open the previous post while the new one loads.

### Fixed

- Moving the element in the page (reordering, frameworks that move nodes) no longer shows the thread twice or makes another request.
- A request still in flight is cancelled when the element is removed or its thread changes, and only the latest request is shown. Before, a late response could be added to an element that was no longer in the page, or next to the new thread.

## [1.1.3] - 2026-10-24

### Fixed

- Replies the thread author hid in Bluesky (threadgate `hiddenReplies`) are now hidden, along with their replies. They were always shown because the list was read with the wrong shape.
- The component no longer renders empty when `localStorage` is blocked (third-party iframes with storage blocked, sandboxed frames, some privacy settings). The app picker still works, but it doesn't remember the chosen app.
- Threads render in browsers without `Intl.Segmenter` (Firefox before 125). Before, nothing rendered as soon as an author had no avatar.
- The "Other app" input in the app picker has an accessible name, from the `otherApp` string. Screen readers used to read its placeholder.
- Submitting an invalid custom domain shows and announces the `invalidDomain` message, using the browser's native validation. Before, the field was only marked invalid.

### Changed

- The reply author name now has the same font size as the handle and time (`--atproto-font-size`). It inherited the page's font size and looked larger. If you set a font size on `.atproto-reply__author`, your rule still applies.
- The "Other app" input no longer capitalizes, autocorrects or autocompletes on mobile keyboards, and shows a URL keyboard.

## [1.1.2] - 2026-10-23

### Fixed

- In browsers without the Popover API (every browser on iOS 16, Firefox before 125), "Reply" and "Comment" open the app picker instead of linking straight to bsky.app. The component shows and hides the picker itself.
- Scrolling or resizing caused by the virtual keyboard no longer closes the app picker while typing a custom domain. This also affected iOS 17 and later.
- On iOS, the author handle is no longer turned into an email link: name and handle are now separated by a rendered space.

### Added

- `.atproto-app-popover--fallback` class on the picker shown without the Popover API. If you style `.atproto-app-popover:popover-open`, style this class too.
- `.atproto-reply__byline` wrapper around the author name and handle.
- The picker button exposes `aria-expanded`, and `aria-controls` in fallback mode.

### Changed

- Long names and handles wrap instead of overflowing the reply header.

## [1.1.1] - 2026-10-20

### Fixed

- The JSR package includes the stylesheet. Link it from `https://jsr.io/@arinspunk/atproto-comments/<version>/src/atproto-comments.css`.

## [1.1.0] - 2026-10-14

### Added

- `strings` attribute (JSON) and property to override UI strings by key. The property takes priority over the attribute; invalid JSON, unknown keys and non-string values are ignored.
- `StringKey` and `UiStrings` types are exported.

### Changed

- Absolute dates (the tooltip on each reply time) use the page's full locale, such as `es-ES`, even for languages without a bundled dictionary.

## [1.0.5] - 2026-10-05

No changes to the component. Republished because the 1.0.4 tag had mismatched package versions.

## [1.0.4] - 2026-10-05

No changes to the component. JSR configuration moved into `deno.json`.

## [1.0.3] - 2026-10-05

No changes to the component. Improved JSR documentation.

## [1.0.2] - 2026-10-03

No changes to the component. Added JSDoc for the JSR documentation.

## [1.0.1] - 2026-10-03

No changes to the component. README: AT Protocol scope and account setup guidance.

## [1.0.0] - 2026-10-03

Initial release.

### Added

- `<atproto-comments>` custom element that fetches the replies to an AT Protocol post from a public AppView and renders them as a comment section, with no visitor sign-in.
- Attributes `thread-uri`, `appview`, `lang` (bundled `en` and `pt`) and `max-depth`.
- Nested replies, oldest first, with links, mentions and hashtags, relative times with the absolute date as a tooltip, and avatar placeholders with initials.
- Replies with moderation labels are hidden.
- "Reply" and "Comment" open an app picker (Bluesky, Mu, Deer or a custom domain) that remembers the visitor's choice.
- Theming with `--atproto-*` custom properties and `.atproto-*` classes.
- Published on npm (ES module and a self-registering script), JSR and jsDelivr.

[1.1.3]: https://github.com/arinspunk/atproto-comments/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/arinspunk/atproto-comments/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/arinspunk/atproto-comments/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/arinspunk/atproto-comments/compare/v1.0.5...v1.1.0
[1.0.5]: https://github.com/arinspunk/atproto-comments/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/arinspunk/atproto-comments/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/arinspunk/atproto-comments/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/arinspunk/atproto-comments/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/arinspunk/atproto-comments/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/arinspunk/atproto-comments/releases/tag/v1.0.0
