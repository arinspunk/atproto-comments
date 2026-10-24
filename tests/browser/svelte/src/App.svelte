<!-- A keyed list that can be reordered, a bound thread-uri and lang, and a {#key} block. -->
<script>
  import Comments from "./Comments.svelte";
  const u = (r) => `at://did:plc:root/app.bsky.feed.post/${r}`;
  let items = $state([{ id: "a", uri: u("SA") }, { id: "b", uri: u("SB") }]);
  let current = $state(u("K1"));
  let lang = $state("en");
  window.app = {
    reverse: () => (items = [...items].reverse()),
    setCurrent: (r) => (current = u(r)),
    setLang: (l) => (lang = l),
  };
</script>

<section id="list">
  {#each items as item (item.id)}
    <div class="item" data-id={item.id}><Comments threadUri={item.uri} {lang} /></div>
  {/each}
</section>

<section id="bound"><Comments threadUri={current} {lang} /></section>

<section id="keyed">
  {#key current}<Comments threadUri={current} />{/key}
</section>
