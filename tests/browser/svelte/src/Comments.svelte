<!-- The pattern from the README's Svelte 5 example. -->
<script>
  import { onMount } from "svelte";
  let { threadUri, lang = "en" } = $props();
  onMount(() => { import("atproto-comments"); });
</script>

<atproto-comments thread-uri={threadUri} {lang}></atproto-comments>
