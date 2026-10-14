# Formularios enviables por link — idiomas EN y ES

## Regla obligatoria

Al crear o modificar cualquier formulario que se pueda enviar por link (o cualquier JSON de tipo questionnaire/scale en `public/data/`), **siempre** hay que definir **los dos idiomas**: inglés (EN) y español (ES).

- **No hay fallback**: no se permite dejar un solo idioma ni usar un idioma por defecto cuando falta el otro.
- Los agentes (Cursor, Codex, Claude, etc.) deben **añadir ambas claves** en cada campo traducible al editar estos JSON.

## Dónde aplica

- `public/data/client-questionnaire.json`
- `public/data/physical-activity-readiness.json`
- `public/data/lefs.json`
- `public/data/uefi.json`
- Cualquier `public/data/movement-analysis-*.json` y otro JSON que implemente los tipos `Questionnaire` o `FunctionalScale` con campos traducibles.

## Estructura de datos

Los textos visibles para el usuario son de tipo `Translatable`:

```json
"label": { "en": "Full name", "es": "Nombre completo" }
```

- **Questionnaire**: `name`, `description`, `sections[].title`, `sections[].description`, `sections[].questions[].label`, `sections[].questions[].options[].label` son `Translatable` (`{ "en": string, "es": string }`).
- **FunctionalScale**: `name`, cada elemento de `questions[]` y `options[].label` son `Translatable`.

Al añadir o cambiar un texto (por ejemplo una nueva pregunta o una nueva opción de select), hay que rellenar **siempre** `en` y `es`. No dejar solo uno.

## Referencias

- Tipos: `src/types/index.ts` (`FormLang`, `Translatable`, `Questionnaire`, `FunctionalScale`).
- Helper: `src/utils/formI18n.ts` (`getText(t, lang)`).
- Especificación de datos: `docs/DATA_SPEC.md`.
