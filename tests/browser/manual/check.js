// Sends AppView requests to this server's mock, counts them, and writes PASS or
// FAIL into #r once the page settles. Load it before the component.
window.calls = 0;
const realFetch = window.fetch;
window.fetch = (url, init) => {
  window.calls++;
  return realFetch(String(url).replace("https://public.api.bsky.app", location.origin), init);
};
window.onerror = (message) => {
  document.getElementById("errors").textContent += `ERROR: ${message}\n`;
};
window.report = (check) =>
  addEventListener("load", () =>
    setTimeout(() => {
      const [ok, text] = check();
      document.getElementById("r").textContent = `${ok ? "PASS" : "FAIL"}: ${text}`;
    }, 800));
window.lists = (sel) => document.querySelectorAll(`${sel} .atproto-comments__list`).length;
