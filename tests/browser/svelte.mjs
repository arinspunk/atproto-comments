// The component inside a Svelte 5 app (built by run.mjs into svelte/dist).

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ORIGIN } from "./harness.mjs";

const SVELTE_DIST = resolve(fileURLToPath(import.meta.url), "../svelte/dist");

export const scenarios = [{
  name: "Svelte 5: reordenar, cambiar de post y de idioma",
  url: `${ORIGIN}/svelte/index.html`,
  dirs: { "/svelte/": SVELTE_DIST },
  evaluate: async () => {
    const els = () =>
      [...document.querySelectorAll("atproto-comments")].map((el) => {
        const where = el.closest("section").id + (el.closest(".item") ? ":" + el.closest(".item").dataset.id : "");
        const replies = [...el.querySelectorAll(".atproto-reply__text")].map((x) => x.textContent).join(",");
        const btn = el.querySelector(".atproto-app-btn--xl")?.textContent;
        return `${where}=${replies}|${btn}`;
      });
    const step = async (fn, ms) => {
      __calls.length = 0;
      __aborted.length = 0;
      fn();
      await sleep(ms);
      return { calls: __calls.length, aborted: __aborted.length, els: els() };
    };
    await sleep(400);
    const initial = { calls: __calls.length, els: els() };
    const reorder = await step(() => app.reverse(), 300);
    const change = await step(() => app.setCurrent("K2"), 300);
    __delay.K3 = 400;
    const twice = await step(() => {
      app.setCurrent("K3");
      setTimeout(() => app.setCurrent("K4"), 50);
    }, 700);
    const lang = await step(() => app.setLang("pt"), 300);
    return { initial, reorder, change, twice, lang };
  },
  expected: {
    initial: {
      calls: 4,
      els: ["list:a=reply-of-SA|Comment", "list:b=reply-of-SB|Comment", "bound=reply-of-K1|Comment", "keyed=reply-of-K1|Comment"],
    },
    reorder: {
      calls: 0,
      aborted: 0,
      els: ["list:b=reply-of-SB|Comment", "list:a=reply-of-SA|Comment", "bound=reply-of-K1|Comment", "keyed=reply-of-K1|Comment"],
    },
    change: {
      calls: 2,
      aborted: 0,
      els: ["list:b=reply-of-SB|Comment", "list:a=reply-of-SA|Comment", "bound=reply-of-K2|Comment", "keyed=reply-of-K2|Comment"],
    },
    twice: {
      calls: 4,
      aborted: 2,
      els: ["list:b=reply-of-SB|Comment", "list:a=reply-of-SA|Comment", "bound=reply-of-K4|Comment", "keyed=reply-of-K4|Comment"],
    },
    lang: {
      calls: 0,
      aborted: 0,
      els: ["list:b=reply-of-SB|Comentar", "list:a=reply-of-SA|Comentar", "bound=reply-of-K4|Comentar", "keyed=reply-of-K4|Comment"],
    },
  },
}];
