// ────────────────────────────────────────────────────────────────────────
// CONTENT LAYER — edit this file to update the site's data.
// The motion/choreography lives in components/MotionSite.jsx; the one-off
// animated copy (hero headline, the typed `target?.value`) stays there
// because it's welded to its animation. Everything *listy* lives here.
// ────────────────────────────────────────────────────────────────────────

export const site = {
  name: 'Dustin Savery',
  role: 'Staff Frontend Engineer',
  location: 'Snohomish, WA',
  email: 'dustin@savery.io',
  github: 'https://github.com/dusave',
  linkedin: 'https://linkedin.com/in/dustinsavery',
};

// CHANGELOG.md — newest first. Add a job by adding a row.
export const ROLES: [string, string, string][] = [
  ['GitHub', 'Staff Frontend Engineer', '2021 — now'],
  ['NVIDIA', 'Senior Frontend Engineer', '2020 — 21'],
  ['Lyft', 'Senior UX Engineer', '2019 — 20'],
  ['GoDaddy', 'Senior UI Engineer', '2016 — 19'],
  ['Virtuoso', 'Senior UI Engineer', '2013 — 16'],
  ['Agilisys', 'UI Engineer', '2012 — 13'],
  ['Avanade', 'UX Developer', '2009 — 12'],
  ['Rane', 'GUI Design Developer', '2008 — 09'],
  ['OneGreatFamily.com', 'Software Engineer', '2007 — 08'],
  ['Neumont University', 'BS, Computer Science', '2005 — 07'],
];

// ── Filter demo data ──────────────────────────────────────────────────────
// Qualifier keys → allowed values (null = open-ended / free text).
export const QUALIFIERS: Record<string, string[] | null> = {
  is: ['open', 'closed', 'draft', 'merged', 'pr', 'issue'],
  state: ['open', 'closed'],
  author: null, assignee: null, label: null, repo: null,
  sort: ['created', 'updated', 'comments', 'reactions'],
  in: ['title', 'body', 'comments'],
  type: ['pr', 'issue'],
};
export const KEYS = Object.keys(QUALIFIERS);
export const KEYWORDS = ['AND', 'OR'];

// Static suggestion pools — the real component pulls these live from the repo.
export const AUTHORS = [
  'dusave', 'octocat', 'monalisa', 'torvalds', 'gaearon', 'sindresorhus',
  'addyosmani', 'kentcdodds', 'wesbos', 'developit', 'rauchg', 'leerob',
  'sebmarkbage', 'acdlite', 'ljharb', 'tj', 'yyx990803', 'antfu',
  'kyleshevlin', 'cassidoo', 'bdougie', 'nat',
];
export const LABELS = [
  'bug', 'enhancement', 'design', 'wontfix', 'good first issue', 'help wanted',
  'documentation', 'duplicate', 'invalid', 'question', 'accessibility', 'a11y',
  'performance', 'regression', 'needs-triage', 'needs-design', 'needs-review',
  'blocked', 'breaking-change', 'dependencies', 'security', 'tech-debt',
  'refactor', 'testing', 'ci', 'infrastructure', 'ux', 'ui', 'mobile', 'desktop',
  'browser-compat', 'flaky-test', 'p0', 'p1', 'p2', 'p3', 'epic', 'spike',
  'discussion', 'proposal', 'stale', 'on-hold', 'ready', 'in-progress', 'wip',
  'frontend', 'backend', 'api', 'database', 'i18n', 'rtl',
];
export const SUGGEST_VALUES: Record<string, string[]> = {
  is: QUALIFIERS.is!, state: QUALIFIERS.state!, sort: QUALIFIERS.sort!,
  in: QUALIFIERS.in!, type: QUALIFIERS.type!,
  author: AUTHORS, assignee: AUTHORS, label: LABELS,
  repo: ['primer/react', 'github/issues', 'facebook/react', 'tc39/proposal-optional-chaining'],
};
