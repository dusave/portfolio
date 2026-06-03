import React, { useState } from 'react';
import { Search, Check, AlertCircle } from 'lucide-react';

// Recreation of the query parsing/validation behavior. The production
// component is GitHub's proprietary code; this explainer demonstrates the
// logic. Try it live: https://github.com/issues

// Field names that can hold a value — used for has:/no: existence checks.
const FIELDS = ['assignee', 'author', 'label', 'milestone', 'project', 'reviewer'];
// Qualifiers whose values are dates and accept relative/comparison syntax.
const DATE_KEYS = ['created', 'updated', 'closed', 'merged-at'];
// Qualifiers whose values are usernames and accept the @me self-reference.
const USER_KEYS = ['author', 'assignee', 'reviewed-by', 'mentions', 'commenter'];

const QUALIFIERS: Record<string, string[] | null> = {
  is: ['open', 'closed', 'draft', 'merged', 'pr', 'issue', 'public', 'private'],
  state: ['open', 'closed', 'merged', 'draft'],
  author: null,
  assignee: null,
  'reviewed-by': null,
  mentions: null,
  commenter: null,
  review: ['none', 'required', 'approved', 'changes-requested'],
  label: null,
  milestone: null,
  repo: null,
  created: null,
  updated: null,
  closed: null,
  'merged-at': null,
  sort: ['created', 'updated', 'comments', 'reactions'],
  in: ['title', 'body', 'comments'],
  type: ['pr', 'issue'],
  has: FIELDS,
  no: FIELDS,
};
const KEYS = Object.keys(QUALIFIERS);

// Fake-but-plausible value suggestions to make the playground feel real.
const VALUE_HINTS: Record<string, string[]> = {
  author: ['@me', 'dusave', 'octocat'],
  assignee: ['@me', 'dusave', 'octocat'],
  'reviewed-by': ['@me', 'dusave'],
  mentions: ['@me', 'dusave'],
  label: ['bug', 'enhancement', 'documentation', '"good first issue"'],
  milestone: ['"v2.0"', '"Q3 polish"'],
  repo: ['github/github'],
  created: ['@today', '@today-7d', '>2024-01-01'],
  updated: ['@today', '@today-7d', '<@today-30d'],
  closed: ['@today', '@today-7d'],
};

// A date value: optional comparator, then @today(-Nd/w/m/y) or an ISO date,
// optionally as a `a..b` range.
const DATEPART = '(?:@today(?:-\\d+[dwmy])?|\\d{4}-\\d{2}-\\d{2}|\\*)';
const DATE_RE = new RegExp(`^(?:>=|<=|>|<)?${DATEPART}(?:\\.\\.${DATEPART})?$`);

type Status = 'ok' | 'error' | 'text' | 'group' | 'op';
type Token = { raw: string; key?: string; value?: string; status: Status; msg?: string };

// Split into tokens while keeping parentheses separate and respecting quotes.
function tokenize(input: string): string[] {
  return input.match(/\(|\)|[\w-]+:"[^"]*"|[\w-]+:[^\s()]+|"[^"]*"|[^\s()]+/g) || [];
}

// Validate a (possibly comma-delimited) value for a qualifier.
function checkValue(key: string, value: string): string | null {
  for (const part of value.split(',')) {
    const v = part.replace(/^"|"$/g, '');
    if (v === '') return `"${key}" has an empty value`;
    if (DATE_KEYS.includes(key)) {
      if (!DATE_RE.test(part)) return `"${part}" isn't a valid date for ${key}`;
      continue;
    }
    if (USER_KEYS.includes(key)) continue; // @me or any username is fine
    const allowed = QUALIFIERS[key];
    if (allowed && !allowed.includes(v)) return `"${v}" not valid for ${key}`;
  }
  return null;
}

function parse(input: string): Token[] {
  return tokenize(input).map((raw): Token => {
    if (raw === '(' || raw === ')') return { raw, status: 'group' };
    if (raw === 'AND' || raw === 'OR') return { raw, status: 'op' };
    const idx = raw.indexOf(':');
    if (idx === -1) return { raw, status: 'text' };
    const key = raw.slice(0, idx).toLowerCase();
    const value = raw.slice(idx + 1);
    if (!(key in QUALIFIERS)) return { raw, key, value, status: 'error', msg: `Unknown qualifier "${key}"` };
    if (value === '') return { raw, key, value, status: 'error', msg: `"${key}" needs a value` };
    const msg = checkValue(key, value);
    if (msg) return { raw, key, value, status: 'error', msg };
    return { raw, key, value, status: 'ok' };
  });
}

const colorFor = (s: Status) =>
  s === 'ok' ? 'var(--green)' : s === 'error' ? 'var(--red)' : s === 'op' ? 'var(--accent)' : 'var(--dim)';

export default function FilterDemo() {
  const [input, setInput] = useState('is:open label:bug,enhancement author:@me created:>=@today-7d');
  const tokens = parse(input);
  const errors = tokens.filter((t) => t.status === 'error');
  const validCount = tokens.filter((t) => t.status === 'ok').length;

  const words = input.split(/\s+/);
  const current = words[words.length - 1] || '';
  let suggestions: string[] = [];
  if (current && current.includes(':')) {
    const [k, ...rest] = current.split(':');
    const v = rest.join(':');
    const lk = k.toLowerCase();
    const pool = VALUE_HINTS[lk] || QUALIFIERS[lk] || [];
    const seg = v.split(',').pop() || ''; // suggest into the last comma segment
    const prefix = v.slice(0, v.length - seg.length);
    suggestions = pool
      .filter((a) => a.toLowerCase().startsWith(seg.toLowerCase()))
      .map((a) => `${k}:${prefix}${a}`);
  } else if (current) {
    suggestions = KEYS.filter((k) => k.startsWith(current.toLowerCase())).map((k) => k + ':');
  }

  const apply = (s: string) => setInput([...words.slice(0, -1), s].join(' ') + ' ');

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 6, background: '#101011', overflow: 'hidden', fontFamily: 'var(--mono)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <Search size={16} style={{ color: 'var(--dim)', flexShrink: 0 }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          aria-label="Search query"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 14 }}
        />
        {errors.length === 0 ? <Check size={16} style={{ color: 'var(--green)' }} /> : <AlertCircle size={16} style={{ color: 'var(--red)' }} />}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
        {tokens.length === 0 && <span style={{ color: 'var(--dim)', fontSize: 12.5 }}>start typing a query…</span>}
        {tokens.map((t, i) => {
          const c = colorFor(t.status);
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 4, fontSize: 12.5, border: `1px solid ${c}44`, color: c, background: `${c}11` }}>
              {t.key ? (<><span style={{ opacity: 0.7 }}>{t.key}:</span><span>{t.value}</span></>) : t.raw}
            </span>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 8 }}>
          <div className="label" style={{ fontSize: 10, padding: '4px 8px' }}>Suggestions</div>
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => apply(s)}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1b')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', background: 'transparent', border: 'none', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer', borderRadius: 4 }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10.5, color: 'var(--dim)' }}>
        {['@me', '@today-7d', 'has:label', 'no:assignee', 'label:a,b', '( … )', 'AND / OR'].map((h) => (
          <span key={h} style={{ padding: '2px 7px', borderRadius: 3, border: '1px solid var(--line)', fontFamily: 'var(--mono)' }}>{h}</span>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px', fontSize: 12, color: errors.length ? 'var(--red)' : 'var(--dim)' }}>
        {errors.length ? errors[0].msg : `${validCount} qualifier(s) valid · query ready`}
      </div>
    </div>
  );
}
