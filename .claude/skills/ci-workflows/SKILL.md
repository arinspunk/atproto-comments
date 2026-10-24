---
name: ci-workflows
description: Cómo leer y cambiar los workflows de GitHub Actions (.github/workflows/ci.yml y release.yml) en este proyecto, donde la configuración gestionada de la organización impide al agente leerlos y le pide confirmación para editarlos. Úsala siempre que una tarea toque el CI o la release, o cuando haya que saber qué pasos ejecutan.
---

# Cambios en `.github/workflows/`

## Por qué hay un procedimiento

La configuración gestionada de Claude Code de la organización (`/Library/Application Support/ClaudeCode/managed-settings.json`) tiene:

- `Read(./.github/workflows/**)` en `deny`: el agente no puede leer los workflows con ninguna herramienta.
- `Edit(./.github/workflows/**)` en una lista de permisos que piden confirmación. Como la herramienta Edit exige leer el fichero antes, en la práctica el agente tampoco puede editarlos.

Esas reglas tienen prioridad sobre `settings.json` y `settings.local.json`, y el usuario no puede anularlas.

## Reglas para el agente

- No intentes leer ni escribir `.github/workflows/` por otra vía (`cat`, `cp`, `sed`, scripts, `git show`). Copiar o mover ficheros desde o hacia ese directorio lo hace siempre el usuario.
- No des por supuesto lo que contienen los workflows. Pide la copia descrita abajo o pregunta.
- Antes de pedir la copia por primera vez en una conversación, recuerda al usuario que esa copia esquiva la regla de la organización, para que confirme que le parece aceptable. El repositorio es público y los workflows se ven en GitHub, pero la decisión es suya.

## Procedimiento

1. **El usuario hace una copia** en la raíz del repo. Sugiérele que la ejecute con `!` para que la salida quede en la conversación:

   ```
   ! cp -R .github github-copy
   ```

2. **El agente lee y edita solo la copia** (`github-copy/workflows/*.yml`) con Read y Edit.

3. **El agente valida el YAML** y muestra los pasos resultantes de cada job:

   ```sh
   deno eval 'import { parse } from "jsr:@std/yaml@^1"; for (const f of ["ci", "release"]) { const d: any = parse(Deno.readTextFileSync(`github-copy/workflows/${f}.yml`)); for (const [name, job] of Object.entries<any>(d.jobs)) console.log(f, name, job.steps.map((s: any) => s.name ?? s.uses ?? s.run)); }'
   ```

4. **El usuario devuelve los ficheros y borra la copia.** Dale el comando exacto con los ficheros cambiados, por ejemplo:

   ```
   ! cp github-copy/workflows/ci.yml github-copy/workflows/release.yml .github/workflows/ && rm -rf github-copy
   ```

5. **El agente comprueba** con `git status --short` que los workflows aparecen modificados y que `github-copy/` ya no existe. `github-copy/` está en `.gitignore` y nunca debe entrar en un commit.

6. **La verificación real es el CI en GitHub.** Un cambio en los workflows no se da por hecho hasta que el run de la rama o del PR haya pasado. Si el cambio añade una comprobación (tests, versiones), confirma también que falla cuando debe, con un commit temporal que la rompa y que luego se revierte.

## Restricciones del CI de este proyecto

- `ci.yml` se ejecuta en push y en PR a `main`. Pasos: checkout, Node 22, Deno 2, `npm ci`, `npx tsc --noEmit`, `deno task test` y `node scripts/build.js`.
- `release.yml` se ejecuta al subir un tag `v*`. Pasos: checkout, Node 22, Deno 2, `npm ci`, `deno task test`, `npm run build`, `deno publish` (JSR, con OIDC: `id-token: write`) y la GitHub Release.
- Los tests van siempre **antes** de cualquier paso que publique.
- La release **no** publica en npm: el usuario lo hace a mano con `npm publish`. No añadas un paso de npm sin que lo pida.
