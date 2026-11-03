import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specToDefinition, coerceAnswer, translatableStrings } from '../ai.js';
import { computeState, validateAll } from '../../shared/logic.js';
import { applyTranslation } from '../../shared/i18n.js';

const spec = {
  title: 'Camp signup', subtitle: 'Summer 2027', layout: 'classic', primaryColor: '#123456', thankYou: 'See you!',
  fields: [
    { key: 'child', type: 'fullname', label: 'Child name', required: true, description: '', options: [], columns: [], products: [], formula: '' },
    { key: 'weeks', type: 'number', label: 'Weeks', required: true, description: '', options: [], columns: [], products: [], formula: '' },
    { key: 'total', type: 'calculation', label: 'Total', required: false, description: '', options: [], columns: [], products: [], formula: '{weeks} * 199' },
    { key: 'allergy', type: 'yesno', label: 'Allergies?', required: false, description: '', options: [], columns: [], products: [], formula: '' },
    { key: 'allergy_details', type: 'textarea', label: 'Details', required: true, description: '', options: [], columns: [], products: [], formula: '' },
  ],
  logic: [{ match: 'all', conditions: [{ field: 'allergy', op: 'equals', value: 'Yes' }], actions: [{ type: 'show', target: 'allergy_details', value: '' }] },
          { match: 'all', conditions: [{ field: 'ghost', op: 'equals', value: 'x' }], actions: [{ type: 'show', target: 'weeks', value: '' }] }],
};

test('AI spec becomes a working form: ids, formulas, logic', () => {
  const def = specToDefinition(spec);
  assert.equal(def.theme.primary, '#123456');
  assert.equal(def.logic.length, 1, 'rule pointing at unknown field dropped');
  const st = computeState(def, { weeks: '3', allergy: 'No' });
  assert.equal(st.values.total, 597);
  assert.ok(st.hidden.has('allergy_details'));
  const { errors } = validateAll(def, { child: { first: 'A', last: 'B' }, weeks: 2, allergy: 'Yes' });
  assert.ok(errors.allergy_details, 'shown field becomes required');
});

test('chat answers are coerced to stored value shapes', () => {
  assert.deepEqual(coerceAnswer({ type: 'checkbox' }, 'Red, Blue'), ['Red', 'Blue']);
  assert.deepEqual(coerceAnswer({ type: 'fullname' }, 'Ada King Lovelace'), { first: 'Ada', last: 'King Lovelace' });
  assert.deepEqual(coerceAnswer({ type: 'address' }, '{"street":"1 Rd","city":"X"}'), { street: '1 Rd', city: 'X' });
  assert.equal(coerceAnswer({ type: 'rating' }, '4 stars'), 4);
  assert.equal(coerceAnswer({ type: 'terms' }, 'yes'), true);
  assert.equal(coerceAnswer({ type: 'text' }, '  '), undefined);
});

test('translations overlay labels but keep stored option values', () => {
  const def = { title: 'T', settings: {}, fields: [{ id: 'c', type: 'radio', label: 'Color', options: ['Red', 'Blue'] }] };
  const keys = translatableStrings(def);
  assert.ok('c.options.1' in keys);
  const es = applyTranslation({ ...def, translations: [{ code: 'es', name: 'Español', strings: { 'c.label': 'Color (es)', 'c.options.0': 'Rojo' } }] }, 'es');
  assert.equal(es.fields[0].label, 'Color (es)');
  assert.deepEqual(es.fields[0].options, ['Red', 'Blue']);
  assert.equal(es.fields[0].optionLabels.Red, 'Rojo');
});

test('choice fields with numeric layout columns are not treated as translatable lists', () => {
  const def = { title: 'T', settings: {}, fields: [{ id: 'r', type: 'radio', label: 'Pick', options: ['A'], columns: 2 }] };
  const keys = translatableStrings(def);
  assert.ok('r.options.0' in keys);
  assert.ok(!Object.keys(keys).some((k) => k.startsWith('r.columns')));
  assert.equal(applyTranslation({ ...def, translations: [{ code: 'x', name: 'X', strings: {} }] }, 'x').fields[0].columns, 2);
});
