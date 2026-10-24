# package-distribution Specification

## Purpose

Define cómo se importa y se distribuye el componente: qué registra cada punto de entrada, qué pasa al importarlo sin DOM, qué tipos incluye el paquete y qué archivo se usa con un `<script>` clásico.

## Requirements

### Requirement: El punto de entrada principal registra el elemento
Importar el punto de entrada principal (`atproto-comments` en npm, `jsr:@arinspunk/atproto-comments` en JSR) SHALL registrar `<atproto-comments>` si esa etiqueta no está registrada. Si ya lo está, SHALL NOT lanzar ningún error.

#### Scenario: Importar el paquete
- **WHEN** una página importa `atproto-comments` y contiene un `<atproto-comments>` con `thread-uri`
- **THEN** el elemento muestra el hilo

#### Scenario: Importar dos veces
- **WHEN** la página importa el punto de entrada principal desde dos URLs distintas que cargan el mismo código
- **THEN** no aparece ningún error en la consola

### Requirement: Punto de entrada sin registro
El paquete SHALL ofrecer un punto de entrada `./element` (`atproto-comments/element` en npm, `jsr:@arinspunk/atproto-comments/element` en JSR) que exporte la clase `AtprotoComments` y los tipos `StringKey` y `UiStrings`, y que SHALL NOT registrar ninguna etiqueta.

#### Scenario: Importar solo la clase
- **WHEN** una página importa `atproto-comments/element` y no importa el punto de entrada principal
- **THEN** `customElements.get("atproto-comments")` es `undefined`

#### Scenario: Registrar la clase con otro nombre
- **WHEN** una página importa `AtprotoComments` desde `atproto-comments/element` y llama a `customElements.define("my-comments", AtprotoComments)`
- **THEN** un `<my-comments>` con `thread-uri` muestra el hilo y no aparece ningún error en la consola

#### Scenario: Las dos etiquetas a la vez
- **WHEN** una página importa el punto de entrada principal y registra una subclase de `AtprotoComments` como `my-comments`
- **THEN** `<atproto-comments>` y `<my-comments>` muestran sus hilos y no aparece ningún error en la consola

### Requirement: Los módulos ESM solo importan archivos con nombre estable
Los archivos ESM publicados (`dist/index.js` y `dist/element.js`) SHALL importar entre sí solo archivos cuyo nombre no cambia entre versiones. La clase `AtprotoComments` SHALL estar definida en un único archivo, de modo que importar los dos puntos de entrada en la misma página dé la misma clase.

#### Scenario: Imports del punto de entrada principal
- **WHEN** se leen los imports de `dist/index.js` en el paquete publicado
- **THEN** el único import es `./element.js`
- **AND** `dist/index.js` no contiene la definición de la clase

#### Scenario: Dos versiones 1.x desde un CDN con rango
- **WHEN** una página carga `dist/index.js` de una versión 1.x y el navegador obtiene `dist/element.js` de otra versión 1.x posterior
- **THEN** el elemento se registra y muestra el hilo

#### Scenario: Los dos puntos de entrada en la misma página
- **WHEN** una página importa `atproto-comments` y también `AtprotoComments` desde `atproto-comments/element`
- **THEN** `customElements.get("atproto-comments") === AtprotoComments`

### Requirement: Los estilos se aplican con cualquier nombre de etiqueta
La hoja de estilos del paquete SHALL aplicarse igual a un elemento registrado con otro nombre de etiqueta que a `<atproto-comments>`. Para eso, el elemento conectado SHALL llevar la clase `atproto-comments`, sin quitar las clases que ya tenga. Las personalizaciones escritas con el selector de etiqueta (`atproto-comments { --atproto-… }`) SHALL seguir teniendo prioridad sobre los valores por defecto, como hasta ahora.

#### Scenario: Otro nombre de etiqueta con la hoja de estilos
- **WHEN** una página carga la hoja de estilos del paquete y registra la clase como `my-comments`
- **THEN** un `<my-comments>` con `thread-uri` se muestra como bloque y su avatar provisional tiene el mismo tamaño y color de fondo que el de un `<atproto-comments>`

#### Scenario: Clases propias del elemento
- **WHEN** el elemento tiene `class="mine"` en el HTML y se conecta
- **THEN** su atributo `class` contiene `mine` y `atproto-comments`

#### Scenario: Personalización con el selector de etiqueta
- **WHEN** la página define `atproto-comments { --atproto-avatar-bg: red }` después de cargar la hoja de estilos del paquete
- **THEN** el avatar provisional de `<atproto-comments>` tiene fondo rojo

### Requirement: Importar sin DOM no hace nada
Importar cualquiera de los dos puntos de entrada en un entorno sin DOM (sin `HTMLElement` ni `customElements`, como el servidor en SSR) SHALL NOT lanzar errores y SHALL NOT registrar nada.

#### Scenario: Importar en Node
- **WHEN** un script de Node sin DOM importa `atproto-comments` y `atproto-comments/element`
- **THEN** los dos imports terminan sin errores
- **AND** `AtprotoComments` es una clase

#### Scenario: Importar en Deno
- **WHEN** un script de Deno sin DOM importa el punto de entrada principal desde JSR
- **THEN** el import termina sin errores

### Requirement: Tipos incluidos en el paquete npm
El paquete npm SHALL incluir declaraciones de TypeScript para los dos puntos de entrada, de modo que un proyecto que lo instale vea los tipos de `AtprotoComments`, `StringKey` y `UiStrings` sin configuración adicional.

#### Scenario: Proyecto TypeScript con npm
- **WHEN** un proyecto TypeScript con `moduleResolution` `bundler` o `node16` instala el paquete y escribe `import { AtprotoComments, type UiStrings } from "atproto-comments"`
- **THEN** `tsc --noEmit` pasa sin errores
- **AND** asignar `{ comment: 1 }` a una variable de tipo `UiStrings` da un error de tipos

#### Scenario: Tipos del punto de entrada sin registro
- **WHEN** el mismo proyecto importa `AtprotoComments` desde `atproto-comments/element`
- **THEN** `tsc --noEmit` pasa sin errores

### Requirement: Archivo para script clásico
El paquete npm SHALL publicar `dist/index.umd.js`, un script que se carga con `<script>` sin `type="module"` y registra `<atproto-comments>`. El paquete SHALL NOT anunciar una condición `require` en `exports`.

#### Scenario: Script clásico desde un CDN
- **WHEN** una página carga `https://cdn.jsdelivr.net/npm/atproto-comments@1/dist/index.umd.js` con un `<script>` clásico y contiene un `<atproto-comments>` con `thread-uri`
- **THEN** el elemento muestra el hilo

#### Scenario: Sin condición require
- **WHEN** se lee `exports` en el `package.json` publicado
- **THEN** ninguna entrada tiene la condición `require`
