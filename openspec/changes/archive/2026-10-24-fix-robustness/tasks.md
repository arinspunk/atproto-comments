# Tasks

## 1. Módulos sin DOM y tests en el CI

- [x] 1.1 Mover las interfaces del AppView de `src/index.ts` a `src/types.ts` y crear `src/thread.ts` (`isHiddenByLabel`, `sortedReplies`) y `src/text.ts` (`normalizeDomain`) con el código actual, sin cambiar comportamiento. `index.ts` importa de ellos y no reexporta nada nuevo. Verificar que `npx tsc --noEmit` y `deno task check` pasan y que `deno publish --dry-run` no da avisos de *slow types*
- [x] 1.2 Añadir `src/thread.test.ts` (`isHiddenByLabel` con y sin etiquetas, `sortedReplies` filtra lo que no es `threadViewPost` y ordena por `createdAt`) y `src/text.test.ts` (`normalizeDomain` con `https://`, barra final, espacios, ruta y dominio sin punto). Verificar que `deno task test` pasa
- [x] 1.3 Extraer de `buildFacetedText` la función pura `facetSegments(record)` en `src/text.ts` (design, decisión 5) y dejar `buildFacetedText` como bucle que crea nodos con los mismos atributos. Añadir tests con emojis, acentos, varias facets, rangos solapados, rangos fuera del texto y enlaces que no son `http(s)`. Verificar que `deno task test` pasa y que un hilo real con menciones, enlaces y hashtags se ve igual que en 1.1.2
- [x] 1.4 En `.github/workflows/ci.yml` y `.github/workflows/release.yml`, añadir `denoland/setup-deno@v2` y un paso `deno task test`. En `release.yml` debe ir antes de `deno publish`. Verificar que el workflow de CI de la rama ejecuta los tests y pasa, y que un test roto a propósito en un commit temporal lo hace fallar

## 2. Respuestas ocultadas en el threadgate (reply-rendering)

- [x] 2.1 Mover `hiddenUris` a `src/thread.ts` leyendo `hiddenReplies` como `unknown[]` y quedándose solo con las cadenas (design, decisión 2). Cambiar `Threadgate` en `src/types.ts` y eliminar `HiddenReply`. Añadir tests: lista con una AT-URI, lista vacía, sin threadgate y lista con valores que no son cadenas. Verificar que `deno task test` pasa
- [x] 2.2 Verificar en el navegador, con un hilo real que tenga una respuesta ocultada por el autor (o una respuesta del AppView modificada con un `hiddenReplies` de prueba), que esa respuesta y sus subrespuestas no aparecen y que el resto del hilo sí

## 3. Avatar provisional sin Intl.Segmenter (reply-rendering)

- [x] 3.1 Mover `getInitials` a `src/text.ts` con la función interna `words` y la alternativa sin `Intl.Segmenter` (design, decisión 4). Añadir tests con y sin `Intl.Segmenter` (quitándolo y restaurándolo en `finally`): "Xulio Zé" da "XZ", un handle da iniciales distintas de `?`, y sin nombre ni handle da `?`. Verificar que `deno task test` pasa
- [x] 3.2 Actualizar la fila de `Intl.Segmenter` en la tabla de compatibilidad de `README.md`: sin él las iniciales se calculan separando por espacios, puntos, guiones y guiones bajos, o quitar la fila si ya no hay diferencia visible que documentar. Verificar que el README no dice que el render falla

## 4. Preferencia sin almacenamiento local (app-chooser)

- [x] 4.1 Crear `src/pref.ts` con `readPref` y `writePref`, con el `try` envolviendo también el acceso a `localStorage` (design, decisión 3), y sustituir los cuatro accesos de `src/index.ts`. Añadir tests: lectura y escritura normales, y un getter de `localStorage` que lanza `SecurityError` (devuelve `null` y no lanza). Verificar que `deno task test` pasa y que `grep -n localStorage src/index.ts` no da resultados
- [x] 4.2 Verificar en el navegador, con `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('', 'SecurityError'); } })` en un script clásico antes de cargar el módulo, que el hilo se renderiza, que elegir Deer abre Deer y que al reabrir el selector ninguna app aparece resaltada

## 5. Campo «Otra app» accesible (app-chooser)

- [x] 5.1 En `buildAppPopover`, poner `aria-label` con `t("otherApp")` en el input y `inputMode = "url"`, `autocapitalize = "off"`, `autocomplete = "off"` y `spellcheck = false`. Verificar en el árbol de accesibilidad de DevTools que el nombre del campo es "Other app" en inglés y "Outra app" con `lang="pt"`
- [x] 5.2 En `openCustom`, implementar la validación nativa según el diagrama de la decisión 6 del design (limpiar la validez primero, `setCustomValidity(t("invalidDomain"))` + `reportValidity()` si es inválido, limpiar en el evento `input`). Verificar en Chrome, Firefox y Safari de escritorio, con popover nativo y con el modo de respaldo forzado, que un dominio inválido muestra el globo con "Invalid domain" por encima del panel, que el panel sigue abierto y que corregirlo y enviarlo abre el post
- [x] 5.3 Cambiar la descripción de `invalidDomain` en la tabla de cadenas de `README.md` («Reserved for custom domain validation») por su uso real: el mensaje que se muestra al enviar un dominio inválido en «Otra app». Verificar que no queda ninguna mención a «Reserved»

## 6. Verificación integrada

- [x] 6.1 Ejecutar `npx tsc --noEmit`, `deno task check`, `deno task test` y `npm run build` y verificar que pasan sin errores
- [x] 6.2 En iOS 16 (sin Popover API), con VoiceOver, verificar que un dominio inválido muestra el mensaje y VoiceOver lo anuncia, y que el campo se anuncia como "Other app". Si falla, sacar 5.2 y 5.3 de este change hacia `app-preference-consistency` (design, riesgos) antes de publicar. Resultado: correcto en iOS 16.7.16. iOS 17 o posterior queda sin probar por falta de dispositivo; el riesgo es bajo porque la validación usa el mismo motor WebKit y, con popover nativo, el globo se ve por encima del panel en Safari de escritorio
- [x] 6.3 En Firefox ESR 115, o en un Firefox con `Intl.Segmenter` eliminado antes de cargar el módulo, verificar que un hilo con autores sin avatar se renderiza con sus iniciales
- [x] 6.4 En Chrome y Safari de escritorio con Popover API, verificar que no hay regresiones en el selector (abrir, elegir app, cerrar fuera y con Escape, preferida resaltada) ni en el texto con facets

## 7. Versión 1.1.3

- [x] 7.1 Subir la versión a 1.1.3 en `package.json`, `package-lock.json` (raíz y `packages[""]`) y `deno.json`, y cambiar todos los `1.1.2` del README (los tres pins de JSR y la frase sobre la versión exacta). Verificar que `grep -rn "1\.1\.2" package.json package-lock.json deno.json README.md` no da resultados

## 8. Tamaño de texto de la cabecera (reply-rendering)

- [x] 8.1 Poner `font-size: var(--atproto-font-size)` en `.atproto-reply__header` y quitarlo de `.atproto-reply__handle` y `.atproto-reply__time`. Verificar en Chrome, sobre una página con texto base de 16 px, que el nombre, el handle y la fecha se calculan a 14 px (antes el nombre salía a 16 px), y que la captura de la cabecera solo cambia en el tamaño del nombre

## Workflow follow-up

- Tras fusionar, crear el tag `v1.1.3` en `main`. La release ejecuta los tests, publica en JSR y crea la GitHub Release. npm se publica a mano con `npm run build && npm publish` y se comprueba con `npm view atproto-comments version`.
- Archivar el change con `/opsx:archive` cuando esté publicado.
