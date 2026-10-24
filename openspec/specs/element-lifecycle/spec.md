# element-lifecycle Specification

## Purpose

Define cuándo el elemento pide el hilo al AppView y cuándo vuelve a renderizar: al conectarse, al desconectarse y reconectarse, y cuando cambian sus atributos o la propiedad `strings`.

## Requirements

### Requirement: Una sola petición al hacer upgrade
Los cambios de atributos, de la propiedad `strings` y la conexión que ocurren en la misma tarea SHALL agruparse en un único render. Un elemento con varios atributos SHALL hacer exactamente una petición al AppView al hacer upgrade, sin importar si el script se carga antes o después del HTML.

#### Scenario: Script cargado antes del HTML
- **WHEN** el script del componente ya está cargado y el parser crea un `<atproto-comments>` con `thread-uri`, `appview`, `lang`, `max-depth` y `strings`
- **THEN** se hace exactamente una petición al AppView
- **AND** el hilo aparece una sola vez

#### Scenario: Script cargado después del HTML
- **WHEN** la página ya contiene un `<atproto-comments>` con `thread-uri`, `appview`, `lang`, `max-depth` y `strings` y después se carga el script del componente
- **THEN** se hace exactamente una petición al AppView
- **AND** el hilo aparece una sola vez

#### Scenario: Elemento creado desde JavaScript
- **WHEN** un script crea el elemento, le pone varios atributos, asigna `strings` y lo inserta en el documento, todo en la misma tarea
- **THEN** se hace exactamente una petición al AppView

### Requirement: Sin actividad mientras está desconectado
El elemento SHALL NOT pedir el hilo ni modificar su contenido mientras no está conectado al documento. Si se desconecta antes de que se ejecute un render pendiente, ese render SHALL NOT ejecutarse.

#### Scenario: Elemento que nunca se inserta
- **WHEN** se crea el elemento con `thread-uri` y no se inserta en el documento
- **THEN** no se hace ninguna petición al AppView

#### Scenario: Insertado y quitado en la misma tarea
- **WHEN** el elemento se inserta en el documento y se quita antes de que termine la tarea actual
- **THEN** no se hace ninguna petición al AppView

### Requirement: Cancelación de la carga al desconectar
Si el elemento se desconecta con una petición en curso, esa petición SHALL cancelarse y su resultado SHALL NOT mostrarse. Al reconectar SHALL repetirse la carga.

#### Scenario: Desconectado durante la carga
- **WHEN** el elemento se quita del documento mientras espera la respuesta del AppView
- **THEN** la petición se cancela y el elemento no añade contenido

#### Scenario: Reconectado tras cancelar
- **WHEN** el elemento se vuelve a insertar después de haberse cancelado su carga
- **THEN** se hace una petición nueva y el hilo aparece una sola vez

### Requirement: Reconectar sin cambios reutiliza el contenido
Si el elemento se reconecta, su carga anterior había terminado y no ha cambiado ningún atributo ni la propiedad `strings`, SHALL conservar el contenido que ya mostraba, sin hacer ninguna petición.

#### Scenario: Mover el elemento en el DOM
- **WHEN** un elemento con el hilo ya cargado se mueve a otro lugar del documento
- **THEN** no se hace ninguna petición al AppView
- **AND** el hilo aparece una sola vez, igual que antes de moverlo

### Requirement: Cambiar el hilo vuelve a cargar
Cambiar `thread-uri`, `appview` o `max-depth` en un elemento conectado SHALL provocar una petición nueva y sustituir el contenido por el del hilo nuevo.

#### Scenario: Otro hilo en el mismo elemento
- **WHEN** en un elemento conectado se cambia `thread-uri` por el de otro post
- **THEN** se hace una petición para el post nuevo
- **AND** el elemento muestra solo las respuestas del post nuevo

#### Scenario: Valor inválido después de uno válido
- **WHEN** en un elemento que muestra un hilo se cambia `thread-uri` por un valor que no empieza por `at://`
- **THEN** el elemento muestra solo el mensaje de error, sin el hilo anterior

### Requirement: El hilo anterior se quita al empezar la carga
Cuando empieza una petición para un hilo distinto del que se muestra, el contenido del hilo anterior SHALL quitarse en ese momento, sin esperar a la respuesta.

#### Scenario: Contenido durante la carga del hilo nuevo
- **WHEN** en un elemento que muestra un hilo se cambia `thread-uri` y la respuesta del post nuevo todavía no ha llegado
- **THEN** el elemento no muestra el hilo anterior ni su botón principal

### Requirement: Solo se muestra la última petición
Empezar una petición nueva, o pasar a un `thread-uri` ausente o inválido, SHALL cancelar la petición en curso. Solo SHALL mostrarse la respuesta de la última petición; cualquier respuesta de una petición anterior que llegue después SHALL descartarse, aunque corresponda al mismo valor.

#### Scenario: Respuesta tardía del hilo anterior
- **WHEN** se cambia `thread-uri` mientras la petición del valor anterior sigue en curso, y esa respuesta llega después que la del valor nuevo
- **THEN** el elemento muestra solo el hilo del valor nuevo

#### Scenario: Volver al valor anterior durante la carga
- **WHEN** `thread-uri` pasa de A a B y de nuevo a A mientras las peticiones siguen en curso, y la primera respuesta de A llega la última
- **THEN** se cancelan la primera petición de A y la de B
- **AND** el elemento muestra el hilo A una sola vez, con los datos de la última petición

#### Scenario: Valor inválido durante la carga
- **WHEN** se cambia `thread-uri` por un valor que no empieza por `at://` mientras la petición del valor anterior sigue en curso
- **THEN** la petición anterior se cancela
- **AND** el elemento muestra solo el mensaje de error, también después de que hubiera llegado esa respuesta

#### Scenario: Quitar thread-uri
- **WHEN** en un elemento conectado se quita el atributo `thread-uri`
- **THEN** se cancela la petición en curso, si la hay
- **AND** el elemento muestra solo el mensaje de error

### Requirement: Cambiar idioma o textos vuelve a renderizar sin red
Cambiar `lang` o `strings` (atributo o propiedad) en un elemento conectado SHALL volver a renderizar con los textos y el formato de fecha nuevos, usando los datos ya cargados, sin hacer ninguna petición.

#### Scenario: Cambiar lang
- **WHEN** en un elemento conectado con el hilo cargado se cambia `lang` de `en` a `pt`
- **THEN** los botones pasan a mostrar "Comentar" y "Responder"
- **AND** no se hace ninguna petición al AppView

#### Scenario: Cambiar strings durante la carga
- **WHEN** se cambia `strings` mientras la petición del hilo sigue en curso
- **THEN** no se hace una segunda petición
- **AND** al llegar la respuesta el hilo se muestra con los textos nuevos

### Requirement: El render sustituye solo su propio contenido
Cada render SHALL sustituir los nodos que insertó el render anterior y SHALL conservar los nodos que la página haya puesto dentro del elemento.

#### Scenario: Contenido propio de la página
- **WHEN** el elemento contiene un `<p>` puesto por la página y después cambia `lang`
- **THEN** el `<p>` sigue dentro del elemento
- **AND** el hilo aparece una sola vez

### Requirement: Estado de carga
Mientras hay una petición del hilo en curso, el elemento SHALL llevar `aria-busy="true"` y la clase `atproto-comments--loading`, y SHALL quitar ambos cuando la carga termina, se cancela o se sustituye por un `thread-uri` inválido. El componente SHALL NOT mostrar ningún texto de carga por defecto.

#### Scenario: Durante la carga
- **WHEN** el elemento espera la respuesta del AppView
- **THEN** tiene `aria-busy="true"` y la clase `atproto-comments--loading`

#### Scenario: Carga terminada
- **WHEN** llega la respuesta, sea el hilo o un error
- **THEN** el elemento ya no tiene `aria-busy` ni la clase `atproto-comments--loading`

#### Scenario: Carga cancelada
- **WHEN** el elemento se desconecta, o pasa a un `thread-uri` inválido, durante la carga
- **THEN** el elemento ya no tiene `aria-busy` ni la clase `atproto-comments--loading`

#### Scenario: Sin carga
- **WHEN** el elemento muestra un hilo y cambia `lang`
- **THEN** no aparece `aria-busy` en ningún momento
