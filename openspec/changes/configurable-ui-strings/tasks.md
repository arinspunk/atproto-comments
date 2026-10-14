# Tasks

## 1. Módulo de localización puro

- [x] 1.1 Crear `src/i18n.ts` con `I18N`, `Lang`, `StringKey`, `UiStrings` y `resolveLang(attr, docLang)` sin acceso a `document`, y verificar que `deno task check` pasa
- [x] 1.2 Implementar `parseStringsAttr(raw)` (JSON → objeto filtrado: solo claves de `I18N.en` con valor cadena; descarta JSON mal formado o que no sea objeto) y verificar con tests en `src/i18n.test.ts` los casos de JSON mal formado, array, `null`, valor numérico y clave desconocida
- [x] 1.3 Implementar `buildStrings(lang, attrStrings, propStrings)` con la combinación `en <- lang <- atributo <- propiedad` y verificar con tests la sustitución parcial, la prioridad de la propiedad sobre el atributo y el respaldo en `en` para idiomas sin diccionario
- [x] 1.4 Implementar `translate(strings, key, vars)` con sustitución de `{var}` y `resolveLocale(raw, fallback)` validando con `Intl.DateTimeFormat.supportedLocalesOf`, y verificar con tests `replyTo` + `{name}`, `es-ES` válido y una etiqueta inválida que cae al respaldo
- [x] 1.5 Ejecutar `deno task test` y verificar que todos los tests de `src/i18n.test.ts` pasan

## 2. Integración en el componente

- [x] 2.1 Sustituir el parámetro `lang: Lang` por `loc: { strings, locale }` en `formatRelativeTime`, `formatAbsoluteDate`, `buildAppPopover`, `buildAppAction`, `renderError` y `renderReply`, importando desde `./i18n.ts`, y verificar que `deno task check` y `npm run check` pasan
- [x] 2.2 Añadir la propiedad `strings` (getter/setter) a `AtprotoComments` y el patrón de upgrade de propiedades (recoger un valor asignado antes de que el elemento se actualice), y verificar en el navegador que `el.strings = {...}` antes de insertar el elemento cambia los textos
- [x] 2.3 Construir el contexto de localización en `connectedCallback` a partir de `lang`, `<html lang>`, el atributo `strings` y la propiedad, y verificar en una página de prueba (HTML local con `dist/index.js`) los escenarios de la spec: `lang="pt-BR"`, `<html lang="es">` sin `strings`, sustitución parcial, JSON mal formado y `aria-label` de `replyTo`
- [x] 2.4 Verificar que `formatAbsoluteDate` usa el `locale` completo: en la página de prueba con `<html lang="es-ES">`, el `title` de `<time>` sale en formato español
- [x] 2.5 Exportar los tipos `StringKey` y `UiStrings` desde `src/index.ts` y verificar que `npm run build` genera `dist/` sin errores y que `deno publish --dry-run` no da avisos nuevos

## 3. Documentación y versión

- [x] 3.1 Documentar en `README.md` el atributo `strings` (con ejemplo de comillas simples y de PHP `esc_attr( wp_json_encode() )`), la propiedad `strings` (que hay que asignar antes de insertar el elemento) y la tabla de claves con su texto en inglés y marcadores, y verificar que el ejemplo copiado a la página de prueba funciona tal cual
- [x] 3.2 Corregir el ejemplo de Lume/Vento del README (`data-thread-uri` → `thread-uri`) y actualizar la fila `lang` de la tabla de atributos (el idioma también controla el formato de fecha) y verificar el README renderizado
- [x] 3.3 Subir la versión a 1.1.0 en `package.json` y `deno.json` y verificar que ambas coinciden
