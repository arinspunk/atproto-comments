# Spec Delta

## ADDED Requirements

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
