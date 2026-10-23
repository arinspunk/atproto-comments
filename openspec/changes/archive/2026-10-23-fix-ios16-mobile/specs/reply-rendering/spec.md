# Spec Delta

## Purpose

Define cómo se presenta cada respuesta del hilo (autor, handle, fecha y texto) para que se lea correctamente en cualquier navegador, incluidos los que autodetectan datos en el texto.

## ADDED Requirements

### Requirement: Nombre y handle separados en el texto
La cabecera de cada respuesta SHALL contener, como texto renderizado, al menos un espacio en blanco entre el nombre visible del autor y su handle (`@handle`). Una separación solo visual por CSS (márgenes, `gap`) o un espacio que el navegador no renderice no cumplen este requisito.

#### Scenario: Texto de la cabecera
- **WHEN** se renderiza una respuesta de "Xulio Zé" con handle `xulioze.com`
- **THEN** el texto renderizado de la cabecera (`innerText`) contiene "Xulio Zé @xulioze.com", no "Xulio Zé@xulioze.com"

#### Scenario: Autor sin nombre visible
- **WHEN** se renderiza una respuesta de un autor sin `displayName` con handle `xulioze.com`
- **THEN** el texto renderizado de la cabecera contiene "xulioze.com @xulioze.com", con espacio

#### Scenario: Data Detectors de iOS
- **WHEN** la respuesta se muestra en Safari o Chrome en iOS
- **THEN** el handle no aparece como enlace y tocarlo no abre la app de correo

#### Scenario: Aspecto visual equivalente
- **WHEN** se renderiza la cabecera en un navegador de escritorio
- **THEN** nombre, handle y fecha siguen en la misma línea cuando caben, con una separación visual equivalente a la anterior

### Requirement: La cabecera no desborda horizontalmente
La cabecera de cada respuesta SHALL ajustarse al ancho disponible, aunque el nombre o el handle sean palabras largas sin espacios.

#### Scenario: Handle largo en móvil
- **WHEN** se renderiza una respuesta cuyo handle es un dominio largo en una ventana de 320 px de ancho
- **THEN** el handle se parte en varias líneas y la cabecera no provoca scroll horizontal
