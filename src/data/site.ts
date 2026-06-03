// ────────────────────────────────────────────────────────────────────────
// EDIT YOUR SITE HERE.
// This is the single source of truth for copy. Change text, add a role,
// drop in a new project — no markup required.
// ────────────────────────────────────────────────────────────────────────

export const site = {
  name: 'Dustin Savery',
  role: 'React UI Engineer',
  location: 'Snohomish, WA',
  email: 'dustin@savery.io',
  intro:
    'Frontend engineer, twenty years of building for web, desktop & mobile. I sweat the design details so the experience feels intuitive & quietly delightful.',
  links: {
    github: 'https://github.com/dusave',
    linkedin: 'https://linkedin.com/in/dustinsavery',
    website: 'https://dustinsavery.com',
  },
};

// Featured work. `href` may be an internal case-study path (/work/…) or external URL.
export const work = [
  {
    title: 'The Filter Component',
    tag: 'GitHub · advanced query & validation',
    year: '2021 — Now',
    blurb:
      'Primary developer & designer. Parses, validates, and guides structured search — handling 500K+ queries every day, live on every issues page, and used by 14 teams across GitHub.',
    href: '/work/filter',
    feature: true,
  },
  {
    title: 'JavaScript: Optional Chaining & Nullish Coalescing',
    tag: 'TC39 · shipped in ES2020',
    year: '2018 — 19',
    blurb:
      'Helped shape, pitch, and land two language features now used by every JavaScript developer on earth.',
    href: 'https://github.com/tc39/proposal-optional-chaining',
  },
  {
    title: 'JitVax',
    tag: 'Lead UI Engineer',
    year: '2021',
    blurb:
      'Built with Seattle volunteers — alerted patients to live vaccine supply during COVID-19. Sunset once vaccines became widely available.',
    href: '',
  },
];

export const experience = [
  {
    co: 'GitHub',
    role: 'Staff Frontend Engineer',
    when: '2021 — Now',
    where: 'Seattle, WA',
    note: 'Technical lead across reusable UI component systems and system-wide architecture.',
  },
  {
    co: 'NVIDIA',
    role: 'Senior Frontend Engineer',
    when: '2020 — 2021',
    where: 'Redmond, WA',
    note: 'Rebuilt the Kaizen UI React component library from scratch — automation + monorepo.',
  },
  {
    co: 'Lyft',
    role: 'Senior UX Engineer',
    when: '2019 — 2020',
    where: 'Seattle, WA',
    note: 'Internal tools — UIs to monitor and act on critical infrastructure systems.',
  },
  {
    co: 'GoDaddy',
    role: 'Senior UI Engineer',
    when: '2016 — 2019',
    where: 'Kirkland, WA',
    note: 'Launched the greenfield GoDaddy Go app (web → mobile), then the UXCore design system.',
  },
  {
    co: 'Virtuoso',
    role: 'Senior UI Engineer',
    when: '2013 — 2016',
    where: 'Seattle, WA',
    note: 'Whole frontend for travel agents, vendors & clients; a complex booking/discount engine.',
  },
];

export const skills = [
  'React',
  'TypeScript',
  'Relay / GraphQL',
  'CSS Modules',
  'Sass',
  'Storybook / MDX',
  'Jest · Playwright · VRT',
  'D3',
  'React Native',
  'Swift / SwiftUI',
  'Ruby on Rails',
];
