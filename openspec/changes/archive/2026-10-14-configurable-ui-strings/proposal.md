# Proposal

## Why

El componente solo trae cadenas en `pt` y `en`. Cualquier otro idioma cae en inglés, así que una página en español, francés o alemán muestra "Reply" o "Comment". El plugin de WordPress que se va a construir sobre este componente necesita pasar sus propias cadenas, traducidas con `__()` y translate.wordpress.org, en vez de depender de que cada idioma se añada al componente y se publique una nueva versión.

## What Changes

- El componente acepta cadenas de interfaz proporcionadas por quien lo integra, mediante un atributo `strings` (JSON) y una propiedad JS `strings` (objeto).
- Las cadenas externas se combinan clave a clave sobre el diccionario incluido del idioma resuelto. Las claves que no se proporcionen siguen saliendo del diccionario incluido (`pt`/`en`, con `en` como respaldo).
- Un valor inválido (JSON mal formado, valores que no son cadena, claves desconocidas) se ignora sin romper el renderizado.
- El formato de fechas (`Intl.DateTimeFormat`) usa el idioma real de la página o del atributo `lang` aunque no exista diccionario incluido para él, para que las fechas absolutas salgan en el idioma del sitio.
- Las claves de cadena pasan a ser API pública documentada en el README. A partir de ahora, renombrarlas es un cambio incompatible.
- Sin cambios incompatibles: sin `strings`, el comportamiento es idéntico al actual.

## Capabilities

### New Capabilities
- `ui-localization`: cómo el componente decide el idioma y el texto de su interfaz (diccionarios incluidos, idioma resuelto, cadenas aportadas por quien lo integra y formato de fechas).

### Modified Capabilities

## Impact

- `src/index.ts`: resolución de idioma, `translate`, `formatAbsoluteDate`, lectura del atributo y la propiedad `strings`.
- Probable extracción de la lógica de cadenas a un módulo sin dependencias del DOM para poder probarla con `deno test`.
- `README.md`: atributo `strings`, propiedad `strings` y tabla de claves.
- API pública: atributo y propiedad nuevos; versión menor (1.1.0).
- Consumidor previsto: el plugin de WordPress (repo aparte), que generará `strings` desde PHP con `wp_json_encode`.
