// App picker with the Popover API and in fallback mode, before and after a
// re-render, driven with real clicks and keys.

import { MOD, U } from "./harness.mjs";

const BODY = `<div style="height:3000px"><atproto-comments thread-uri="${U("P")}"></atproto-comments></div>${MOD}`;

async function drive(page) {
  await page.waitForTimeout(300);
  const xl = page.locator("atproto-comments > .atproto-app-action .atproto-app-btn--xl");
  const panelOpen = (scope) =>
    page.evaluate((scope) => {
      const pop = document.querySelector(`${scope} .atproto-app-popover`);
      return pop.classList.contains("atproto-app-popover--fallback") ? !pop.hidden : pop.matches(":popover-open");
    }, scope);
  const main = "atproto-comments > .atproto-app-action";
  // With the Popover API the panel is set up on its `toggle` event, which fires asynchronously.
  const settle = () => page.waitForTimeout(100);
  // Bottom-left corner of the viewport, away from the component.
  const outside = async () => { await page.mouse.click(5, page.viewportSize().height - 5); await settle(); };
  const r = {};

  await xl.click();
  await settle();
  r.opens = (await panelOpen(main)) && (await xl.getAttribute("aria-expanded")) === "true";
  await outside();
  r.closesOutside = !(await panelOpen(main)) && (await xl.getAttribute("aria-expanded")) === "false";
  await xl.click();
  await settle();
  await page.keyboard.press("Escape");
  await settle();
  r.closesEscape = !(await panelOpen(main));

  await xl.click();
  await settle();
  const deer = page.locator(`${main} .atproto-app-popover__link`, { hasText: "Deer" });
  r.deerHref = await deer.getAttribute("href");
  // Keep the link from navigating; its click handler still runs.
  await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { once: true }));
  await deer.click();
  await settle();
  r.closesAfterChoosing = !(await panelOpen(main));
  await xl.click();
  await settle();
  r.preferred = await page.locator(`${main} .atproto-app-popover__link--active`).allTextContents();

  // Re-render with the panel open, then use the new picker.
  await page.evaluate(() => document.querySelector("atproto-comments").setAttribute("lang", "pt"));
  await page.waitForTimeout(100);
  r.newLabel = await xl.textContent();
  await outside();
  await xl.click();
  await settle();
  r.newOpens = await panelOpen(main);
  await outside();
  r.newClosesOutside = !(await panelOpen(main)) && (await xl.getAttribute("aria-expanded")) === "false";
  await page.locator(".atproto-reply .atproto-app-btn").first().click();
  await settle();
  r.replyOpens = await panelOpen(".atproto-reply");
  return r;
}

const expected = {
  opens: true,
  closesOutside: true,
  closesEscape: true,
  deerHref: "https://deer.social/profile/did:plc:root/post/P",
  closesAfterChoosing: true,
  preferred: ["Deer"],
  newLabel: "Comentar",
  newOpens: true,
  newClosesOutside: true,
  replyOpens: true,
};

export const scenarios = [
  { name: "selector con Popover API", body: BODY, run: drive, expected },
  {
    name: "selector en modo de respaldo",
    body: BODY,
    run: drive,
    expected,
    init: () => {
      delete HTMLElement.prototype.popover;
    },
  },
];
