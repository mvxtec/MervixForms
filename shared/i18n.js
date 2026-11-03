// Form translations. def.translations = [{ code, name, strings: { "fieldId.label": "...", "fieldId.options.0": "...", "_form.thankYou": "..." } }]
// Option translations change only what respondents see; stored values stay in the original language
// so logic, reports and exports keep working.

export const LANGUAGES = [
  ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'],
  ['hi', 'हिन्दी'], ['ar', 'العربية'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['pl', 'Polski'],
];

export const TEXT_PROPS = ['label', 'description', 'placeholder', 'subheading', 'text', 'lowLabel', 'highLabel', 'yesLabel', 'noLabel'];
export const LIST_PROPS = ['options', 'rows', 'columns'];

// Returns a definition with translated display strings. Each field gets `optionLabels` (and `rowLabels`/`columnLabels`)
// mapping original values to translated labels, so inputs can show translations while storing originals.
export function applyTranslation(def, code) {
  const t = (def.translations || []).find((x) => x.code === code);
  if (!t) return def;
  const s = t.strings || {};
  const fields = def.fields.map((f) => {
    const out = { ...f };
    for (const k of TEXT_PROPS) if (s[`${f.id}.${k}`]) out[k] = s[`${f.id}.${k}`];
    for (const k of LIST_PROPS) {
      if (!Array.isArray(f[k])) continue;
      const labels = {};
      f[k].forEach((o, i) => { labels[o] = s[`${f.id}.${k}.${i}`] || o; });
      out[`${k === 'options' ? 'option' : k.slice(0, -1)}Labels`] = labels;
    }
    return out;
  });
  const settings = { ...def.settings };
  if (s['_form.thankYou']) settings.thankYou = { ...settings.thankYou, message: s['_form.thankYou'] };
  if (s['_form.submitLabel']) settings.submitLabel = s['_form.submitLabel'];
  return { ...def, title: s['_form.title'] || def.title, fields, settings, language: code };
}
