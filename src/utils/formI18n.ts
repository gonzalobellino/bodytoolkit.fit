import type { FormLang, Translatable } from '../types';

/**
 * Resolve translated string for form content. No fallback: lang must be present in data.
 * Use when rendering questionnaire/scale fields (name, title, label, options).
 */
export function getText(t: Translatable, lang: FormLang): string {
  return t[lang];
}
