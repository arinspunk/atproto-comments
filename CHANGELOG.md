# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/): new attributes, properties, `strings` keys, CSS custom properties or classes are minor releases.

## [2.0.0] - 2026-11-05

A major release: the app picker is a new panel with new markup, and each reply's author and date are now links. Pages that only use the component's defaults need no changes besides the version pins; pages with their own CSS for the picker or the byline should read [Migrating from 1.x](#migrating-from-1x).

### Removed

- The popover app picker, its use of the Popover API and its fallback mode for browsers without it, with the classes `.atproto-app-popover`, `.atproto-app-popover--fallback`, `.atproto-app-popover__link`, `.atproto-app-popover__link--active`, `.atproto-app-popover__separator`, `.atproto-app-popover__custom`, `.atproto-app-popover__input` and `.atproto-app-popover__go`.
- `popovertarget`, `aria-controls` and `aria-expanded` on the buttons that open the picker.

### Changed

- **Comment** and **Reply** open a modal panel anchored to the bottom of the window, full width, with its content in a centred column. There is one panel per element, a `<dialog>` created the first time it opens. It has a heading ("Comment in…" or "Reply to Ana in…"), a close button, the list of apps and the "Other app" field. It closes with Escape, its close button, a click outside it or choosing an app, and focus goes back to the button that opened it. Scrolling or resizing the window no longer closes it, and an ancestor with `transform` or `z-index` can no longer misplace or cover it.
- The buttons that open the picker have `aria-haspopup="dialog"`.
- The picker lists more apps: Bluesky first, then Anisota, Blacksky, Deer, Impro, Mu, Northsky and Red Dwarf. The app the visitor chose last comes first, marked "Last used". A custom domain is prefilled in "Other app", as before. The stored preference is the same, so a choice made with 1.x is kept.
- "Other app" is now the `<label>` of its field instead of a separator above it.
- Each app opens posts, profiles and hashtags with its own routes. Hashtags open in the chosen app only if it has hashtag pages (Anisota and Red Dwarf don't); otherwise, and for custom domains, they open on bsky.app.
- The author of each reply (`.atproto-reply__byline`) is now a link to their profile, an `<a>` instead of a `<span>`, and the date is wrapped in a new link to the reply, `.atproto-reply__permalink`. Both open in the visitor's chosen app, like mentions. The `· ` before the date moved from `.atproto-reply__time::before` to `.atproto-reply__permalink::before`. Authors with no DID are shown without links, as before.
- The app picker needs `<dialog>` (Safari and iOS 15.4, which the component already required) instead of the Popover API.
- A reply whose author has no DID no longer has a **Reply** button or a **View more replies** link: they opened `/profile//post/…`.
- The accessible name of a **Reply** button (`replyTo`) and the picker's heading (`replyIn`) use the same name as the reply's byline. An author with an empty display name and no handle is now "Unknown" (`unknownAuthor`) instead of an empty name ("Reply to ").

### Added

- `strings` keys `commentIn` (`Comment in…`, `Comentar em…`), `replyIn` (`Reply to {name} in…`, `Responder a {name} em…`), `close` (`Close`, `Fechar`), `lastUsed` (`Last used`, `Última usada`) and `pickerNote`, an optional note under the picker's heading, empty by default.
- Classes for the new panel: `.atproto-app-sheet`, `__body`, `__header`, `__title`, `__close`, `__note`, `__list`, `__app`, `__app--last-used`, `__name`, `__badge`, `__arrow`, `__custom`, `__label`, `__input` and `__go`.

### Migrating from 1.x

- Change the version pins: `atproto-comments@1/` → `atproto-comments@2/` on the CDN, `^2.0.0` in npm, `@2.0.0` on JSR.
- Rename the picker classes in your CSS:

  | 1.x | 2.0 |
  |---|---|
  | `.atproto-app-popover` | `.atproto-app-sheet` (the `<dialog>`; its content is in `.atproto-app-sheet__body`) |
  | `.atproto-app-popover--fallback` | none: there is no fallback mode |
  | `.atproto-app-popover__link` | `.atproto-app-sheet__app` |
  | `.atproto-app-popover__link--active` | `.atproto-app-sheet__app--last-used` |
  | `.atproto-app-popover__separator` | `.atproto-app-sheet__label` |
  | `.atproto-app-popover__custom` | `.atproto-app-sheet__custom` |
  | `.atproto-app-popover__input` | `.atproto-app-sheet__input` |
  | `.atproto-app-popover__go` | `.atproto-app-sheet__go` |
  | `.atproto-app-popover:popover-open` | `.atproto-app-sheet[open]` |

- `.atproto-reply__byline` is now an `<a>` when the author has a DID: rules written for `span.atproto-reply__byline` no longer match, and your page's link styles may apply to it. The date's `<time>` is inside the new `a.atproto-reply__permalink`; a rule on `.atproto-reply__time::before` should move to `.atproto-reply__permalink::before`.
- If your page relied on a button's `aria-expanded` or `popovertarget`, use the `open` attribute of `dialog.atproto-app-sheet` instead.
- To stay on 1.x for now, pin `@1` or `@1.4.0`: 1.x is unchanged.

## [1.4.0] - 2026-10-24

### Added

- `go` string: the accessible name of the `→` button in the app picker (`Open`, `Abrir`). The arrow is now hidden from screen readers.
- `unknownAuthor` string: the name shown for an author with no display name or handle (`Unknown`, `Desconhecido`). It was always "Unknown" in English.
- Loading state: while the replies load, the element has `aria-busy="true"` and the class `atproto-comments--loading`. There is no loading text by default.

### Changed

- Mentions and the link to more replies open in the app the visitor chose in the app picker, or on bsky.app if they haven't chosen one. Hashtags do too when the chosen app is Bluesky, Mu or Deer; with a custom domain they still open on bsky.app. Links use the app chosen when they are opened, even if that changed after the replies rendered.
- The default `viewMore` text is now `View more replies` (`Ver mais respostas`), since the link no longer always goes to Bluesky. Set `viewMore` in `strings` to keep the old text.
- Replies more than a year old show the short date in the page's language (`1/2/20` in `en-US`, `02/01/20` in `pt-PT`) instead of a fixed `dd/mm/yyyy`.
- The button that opens the app picker no longer has `aria-haspopup`: the picker is not a menu.

### Fixed

- Replies written by an account labeled `!hide`, `porn` or another hiding label are now hidden, with their replies. Labels on the author's profile record (avatar, banner) don't hide anything.
- When every reply is hidden, only the **Comment** button is shown, without an empty list. Nested replies get the same treatment.

## [1.3.0] - 2026-10-24

### Added

- `atproto-comments/element` (JSR: `jsr:@arinspunk/atproto-comments/element`) exports `AtprotoComments` and its types without registering any tag. Use it to register the element under another name only.
- The npm package includes TypeScript types for both entry points.
- Importing the package outside the browser (server-side rendering) no longer throws: it registers nothing.
- The element adds the class `atproto-comments` to itself, and the stylesheet targets it too, so an element registered under another tag name gets the same styles. Before, it rendered unstyled. Overrides written as `atproto-comments { … }` keep the same priority.

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

[2.0.0]: https://github.com/arinspunk/atproto-comments/compare/v1.4.0...v2.0.0
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
