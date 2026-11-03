// Safe arithmetic evaluator for calculated fields. Supports + - * / % ^, parentheses,
// numbers, {fieldId} references and functions: min max round floor ceil abs sqrt sum avg if.
// No eval: input is tokenized and parsed with a recursive-descent parser.

const FUNCS = {
  min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
  round: (x, d = 0) => { const f = 10 ** d; return Math.round(x * f) / f; },
  sum: (...a) => a.reduce((s, x) => s + x, 0),
  avg: (...a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  if: (c, a, b) => (c ? a : b),
};

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (/[a-z_]/i.test(c)) {
      let j = i; while (j < src.length && /[a-z0-9_]/i.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j).toLowerCase() }); i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/%^(),<>'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Unexpected "${c}" in formula`);
  }
  return out;
}

function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const eat = (v) => { if (peek()?.v === v) { p++; return true; } return false; };
  const expect = (v) => { if (!eat(v)) throw new Error(`Expected "${v}"`); };

  const cmp = () => {
    let l = add();
    for (;;) {
      const op = peek()?.v;
      if (!['>', '<', '>=', '<=', '==', '!='].includes(op)) return l;
      p++; const r = add();
      l = { '>': l > r, '<': l < r, '>=': l >= r, '<=': l <= r, '==': l === r, '!=': l !== r }[op] ? 1 : 0;
    }
  };
  const add = () => {
    let l = mul();
    for (;;) { if (eat('+')) l += mul(); else if (eat('-')) l -= mul(); else return l; }
  };
  const mul = () => {
    let l = pow();
    for (;;) {
      if (eat('*')) l *= pow();
      else if (eat('/')) { const r = pow(); l = r === 0 ? 0 : l / r; }
      else if (eat('%')) l %= pow();
      else return l;
    }
  };
  const pow = () => { const b = unary(); return eat('^') ? b ** pow() : b; };
  const unary = () => (eat('-') ? -unary() : eat('+') ? unary() : atom());
  const atom = () => {
    const tk = tokens[p++];
    if (!tk) throw new Error('Unexpected end of formula');
    if (tk.t === 'num') return tk.v;
    if (tk.v === '(') { const v = cmp(); expect(')'); return v; }
    if (tk.t === 'id' && FUNCS[tk.v]) {
      expect('(');
      const args = [];
      if (!eat(')')) { do args.push(cmp()); while (eat(',')); expect(')'); }
      return FUNCS[tk.v](...args);
    }
    throw new Error(`Unknown token "${tk.v}"`);
  };
  const v = cmp();
  if (p < tokens.length) throw new Error('Unexpected trailing input');
  return v;
}

export function toNumber(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object' && 'total' in v) return Number(v.total) || 0;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function evaluateFormula(expr, values) {
  if (!expr) return '';
  try {
    const src = String(expr).replace(/\{([^}]+)\}/g, (_, id) => `(${toNumber(values[id.trim()])})`);
    const v = parse(tokenize(src));
    return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : 0;
  } catch {
    return '';
  }
}
