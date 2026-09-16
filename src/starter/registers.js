/**
 * The copy a generated starter section is made of.
 *
 * ## ⭐ THIS IS FRAMEWORK'S OWN PROSE, AND THAT IS THE POINT
 *
 * A developer-authored `starter:` key in `meta.js` was considered and rejected
 * [Diego, 2026-09-16]: developers do not want to write sample content, it drifts
 * against the `content:` declaration it is supposed to match, and — decisively —
 * **it can never be localized.** An authored string is the foundation's own
 * words and is shown verbatim in every UI language, which is the rule `title` /
 * `titleInferred` already states. Paragraphs of a developer's English would ship
 * to every author in the world with no way to translate them.
 *
 * ⇒ Deriving the copy here makes it OURS, which puts it in the one category we
 * already translate — the same file that carries the family labels
 * (`src/locales/*.json`). ⚠️ **That is the plan, not the state.** These strings
 * are English literals today; moving them behind locale keys is additive on both
 * sides and needs no code change here beyond the lookup.
 *
 * ## The three tiers
 *
 * A register is resolved `family → group → generic`, most specific wins. The
 * middle tier is what makes the table tractable: 8 groups cover every family,
 * and a family entry is written only where the group's copy would be actively
 * wrong — a `pricing` section wants tiers, a `faq` wants questions, and a
 * `team` wants people. Everything else reads fine from its group.
 *
 * ⛔ A register is never partial-by-accident: an entry merges over its group, so
 * a family may override one key and inherit the rest.
 */

/**
 * The fallback. Every key a register can carry appears here, which is what makes
 * the merge total — a family or group may omit anything.
 */
const GENERIC = {
  eyebrow: 'Section label',
  headline: 'A short, specific headline',
  subhead: 'One line that adds what the headline left out',
  sentences: [
    'Replace this with the real copy. Two or three sentences is usually the right length for an opening paragraph — long enough to say something, short enough to read.',
    'A second paragraph carries the detail the first one set up.',
    'A third is usually one too many, and this one is here so you can see what that looks like.',
  ],
  bullets: ['The first point', 'The second point', 'The third point'],
  actions: [
    { label: 'Primary action', href: '/' },
    { label: 'Secondary action', href: '/about' },
  ],
  records: [
    { title: 'First entry', line: 'A sentence about the first entry.' },
    { title: 'Second entry', line: 'A sentence about the second entry.' },
    { title: 'Third entry', line: 'A sentence about the third entry.' },
    { title: 'Fourth entry', line: 'A sentence about the fourth entry.' },
    { title: 'Fifth entry', line: 'A sentence about the fifth entry.' },
    { title: 'Sixth entry', line: 'A sentence about the sixth entry.' },
  ],
  icons: ['sparkles', 'layers', 'zap', 'circle-check', 'compass', 'package'],
  image: { shape: 'wide', alt: 'Placeholder image' },
  // Code samples, for a component that declares `snippets:`. Short and real —
  // a snippet is displayed with syntax highlighting, so a nonsense one shows
  // the highlighting is broken when it is not.
  snippets: [
    { language: 'bash', code: 'npx uniweb create my-site\ncd my-site && npm run dev' },
    { language: 'js', code: "export default function Hero({ content }) {\n  return <h1>{content.title}</h1>\n}" },
  ],
  // ⭐ The elements to fill when a component declares NO `content:` at all.
  // 13 of the 92 sections in the official templates are in that state, several
  // of them with a perfectly clear family (`marketing/Hero`, `conference/Hero`).
  // Refusing them would hand an author an empty box for a section whose shape
  // we know — so the family answers when the developer did not, and the caller
  // is TOLD that is what happened (`elementsInferred` on the result), the same
  // way `titleInferred` marks a title the build invented.
  elements: ['title', 'paragraphs'],
}

/** One register per group — the workhorse tier. */
const BY_GROUP = {
  opening: {
    elements: ['pretitle', 'title', 'paragraphs', 'links'],
    eyebrow: 'Now in open beta',
    headline: 'Say what this page is, in one line',
    subhead: 'And what the visitor should do about it',
    sentences: [
      'An opening paragraph earns the scroll. Say who this is for and what changes for them, then stop.',
      'A second sentence can carry the proof — a number, a name, a date.',
    ],
    bullets: ['No setup required', 'Works with what you already use', 'Cancel any time'],
    actions: [
      { label: 'Get started', href: '/start' },
      { label: 'See how it works', href: '/how-it-works' },
    ],
    icons: ['rocket', 'sparkles', 'zap'],
    image: { shape: 'wide', alt: 'A wide opening image' },
  },

  explaining: {
    snippets: [
      { language: 'js', code: "import { useWebsite } from '@uniweb/kit'\n\nconst site = useWebsite()" },
      { language: 'yaml', code: 'title: My page\nsections:\n  - hero\n  - features' },
    ],
    elements: ['title', 'paragraphs', 'image'],
    eyebrow: 'How it works',
    headline: 'Explain the thing once, properly',
    subhead: 'The detail that makes it make sense',
    sentences: [
      'This is where the real explanation goes — the paragraph a reader came for, written in your own words rather than in headlines.',
      'Break it where the idea breaks. A second paragraph is a second idea, not a second attempt at the first one.',
    ],
    bullets: ['What it does', 'What it does not do', 'What that costs you'],
    actions: [{ label: 'Read the full guide', href: '/guide' }],
    records: [
      { title: 'First, the setup', line: 'What has to be true before any of this starts.' },
      { title: 'Then, the work', line: 'What actually happens, in the order it happens.' },
      { title: 'Finally, the result', line: 'What the reader is left holding.' },
    ],
    icons: ['book-open', 'workflow', 'compass'],
    image: { shape: 'landscape', alt: 'An illustration of the idea' },
  },

  listing: {
    elements: ['title', 'items'],
    eyebrow: 'The collection',
    headline: 'Many of one thing',
    subhead: 'Ordered the way a visitor would look for them',
    sentences: [
      'A list section usually needs one line of framing and no more — the entries are the content.',
    ],
    bullets: ['Sorted by date', 'Filtered to the current year', 'Six shown, more on the archive page'],
    actions: [{ label: 'See all', href: '/all' }],
    records: [
      { title: 'The first one', line: 'A line of description for the first entry.' },
      { title: 'The second one', line: 'A line of description for the second entry.' },
      { title: 'The third one', line: 'A line of description for the third entry.' },
      { title: 'The fourth one', line: 'A line of description for the fourth entry.' },
      { title: 'The fifth one', line: 'A line of description for the fifth entry.' },
      { title: 'The sixth one', line: 'A line of description for the sixth entry.' },
    ],
    icons: ['layers', 'package', 'file-text'],
    image: { shape: 'square', alt: 'A thumbnail for one entry' },
  },

  convincing: {
    elements: ['title', 'items'],
    eyebrow: 'Why it holds up',
    headline: 'The evidence, not the adjectives',
    subhead: 'Numbers and names beat superlatives',
    sentences: [
      'A convincing section works when the specifics do the work. Swap this for the real figure, the real quote, the real name.',
    ],
    bullets: ['Measured, not estimated', 'Independently checked', 'Updated every quarter'],
    actions: [{ label: 'See the data', href: '/data' }],
    records: [
      { title: '94%', line: 'of what this number actually measures' },
      { title: '3×', line: 'compared against what, over what period' },
      { title: '12 min', line: 'the thing that used to take an hour' },
      { title: '40+', line: 'teams, in the sense you mean by team' },
    ],
    icons: ['trending-up', 'badge-check', 'shield'],
    image: { shape: 'landscape', alt: 'A chart or proof image' },
  },

  acting: {
    elements: ['title', 'paragraphs', 'links'],
    eyebrow: 'Ready when you are',
    headline: 'Ask for exactly one thing',
    subhead: 'The step after this one should be obvious',
    sentences: [
      'An action section is the one place to be blunt. Say what happens next and how long it takes.',
    ],
    bullets: ['Takes about two minutes', 'No card required', 'You can undo it'],
    actions: [
      { label: 'Start now', href: '/start' },
      { label: 'Talk to us first', href: '/contact' },
    ],
    icons: ['arrow-right', 'mail', 'circle-check'],
    image: { shape: 'square', alt: 'An image beside the call to action' },
  },

  navigating: {
    elements: ['title', 'links'],
    eyebrow: 'Find your way',
    headline: 'Where to go next',
    subhead: 'The three places most visitors want',
    sentences: ['One line, if any. Navigation is for getting out of, not reading.'],
    bullets: ['Documentation', 'Pricing', 'Support'],
    actions: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Support', href: '/support' },
      { label: 'Contact', href: '/contact' },
    ],
    records: [
      { title: 'Product', line: 'What it is and what it costs' },
      { title: 'Developers', line: 'Docs, reference, and the changelog' },
      { title: 'Company', line: 'Who we are and how to reach us' },
    ],
    icons: ['compass', 'map-pin', 'arrow-right'],
    image: { shape: 'square', alt: 'A wordmark or logo' },
  },

  embedding: {
    snippets: [
      { language: 'html', code: '<iframe src="https://example.com/embed" title="Embedded"></iframe>' },
    ],
    elements: ['title', 'paragraphs', 'image'],
    eyebrow: 'From elsewhere',
    headline: 'Something that lives on another service',
    subhead: 'Say what it is before it loads',
    sentences: [
      'An embed needs framing, because a visitor sees the frame before the content arrives — and sometimes instead of it.',
    ],
    bullets: ['Loads from a third party', 'Needs network access', 'Has its own privacy policy'],
    actions: [{ label: 'Open in a new tab', href: 'https://example.com' }],
    icons: ['globe', 'play', 'map-pin'],
    image: { shape: 'wide', alt: 'A preview of the embedded content' },
  },

  organizing: {
    elements: ['title', 'items'],
    eyebrow: 'In this section',
    headline: 'Arrange what is already here',
    subhead: 'Grouping, not new content',
    sentences: ['A short line of framing, then let the arrangement speak.'],
    bullets: ['First group', 'Second group', 'Third group'],
    actions: [{ label: 'Expand all', href: '#' }],
    records: [
      { title: 'The first panel', line: 'What a reader finds when they open this one.' },
      { title: 'The second panel', line: 'What a reader finds when they open this one.' },
      { title: 'The third panel', line: 'What a reader finds when they open this one.' },
    ],
    icons: ['layers', 'list-checks', 'workflow'],
    image: { shape: 'landscape', alt: 'An image inside one panel' },
  },
}

/**
 * Family overrides — written ONLY where the group's copy would be actively
 * wrong for that family. Each merges over its group, so an entry names the keys
 * that differ and inherits everything else.
 */
const BY_FAMILY = {
  hero: {
    eyebrow: 'Now in open beta',
    headline: 'Ship your site in an afternoon',
    subhead: 'Content, code and hosting, without the plumbing in between',
    sentences: [
      'Write in markdown, pick a foundation, and publish. No build server to run and nothing to configure before the first page is live.',
    ],
    bullets: ['Live in one command', 'Any static host', 'Bring your own domain'],
    actions: [
      { label: 'Get started', href: '/start' },
      { label: 'See the docs', href: '/docs' },
    ],
  },

  profile: {
    elements: ['pretitle', 'title', 'subtitle', 'paragraphs', 'image', 'links'],
    eyebrow: 'Professor of Computer Science',
    headline: 'Dr. Rowan Alvarez',
    subhead: 'Distributed systems, and the people who run them',
    sentences: [
      'A short biography goes here — where they work, what they work on, and the one thing a visitor is most likely to be looking for.',
    ],
    bullets: ['PhD, University of Toronto', 'Editor, Journal of Systems Research'],
    actions: [
      { label: 'Publications', href: '/publications' },
      { label: 'Contact', href: '/contact' },
    ],
    image: { shape: 'portrait', alt: 'Portrait photograph' },
    icons: ['mail', 'globe', 'file-text'],
  },

  team: {
    eyebrow: 'The people',
    headline: 'Who you will actually be working with',
    records: [
      { title: 'Ada Okonkwo', line: 'Principal engineer' },
      { title: 'Marek Duval', line: 'Head of research' },
      { title: 'Priya Raman', line: 'Design lead' },
      { title: 'Tomas Lindqvist', line: 'Infrastructure' },
      { title: 'Nadia Haddad', line: 'Product' },
      { title: 'Sam Oyelaran', line: 'Support lead' },
    ],
    image: { shape: 'square', alt: 'Portrait photograph' },
    icons: ['users', 'mail', 'globe'],
  },

  faq: {
    elements: ['title', 'items'],
    eyebrow: 'Questions',
    headline: 'The things people ask before they sign up',
    records: [
      { title: 'How long does setup take?', line: 'About ten minutes, and you can stop halfway and come back.' },
      { title: 'Can I use my own domain?', line: 'Yes, on every plan, including the free one.' },
      { title: 'What happens to my content if I leave?', line: 'You export it as markdown and it stays readable without us.' },
      { title: 'Do you offer support?', line: 'By email on every plan; by phone on the team plan.' },
    ],
    icons: ['circle-help', 'message-square', 'book-open'],
  },

  pricing: {
    elements: ['title', 'subtitle', 'items'],
    eyebrow: 'Plans',
    headline: 'Pick the one that fits, change it later',
    subhead: 'Every plan includes the whole product',
    records: [
      { title: 'Free', line: 'One site, a uniweb.app subdomain, community support.' },
      { title: 'Pro — $12/month', line: 'Five sites, your own domain, email support.' },
      { title: 'Team — $49/month', line: 'Unlimited sites, shared workspaces, priority support.' },
    ],
    bullets: ['No setup fee', 'Cancel any time', 'Annual billing saves two months'],
    actions: [{ label: 'Start free', href: '/signup' }, { label: 'Compare plans', href: '/pricing' }],
    icons: ['tag', 'circle-check', 'badge-check'],
  },

  testimonials: {
    elements: ['title', 'items'],
    eyebrow: 'What people say',
    headline: 'In their words, not ours',
    records: [
      { title: 'Ada Okonkwo, CTO at Northwind', line: 'We replaced three tools with this and stopped thinking about it. That is the highest compliment I have.' },
      { title: 'Marek Duval, Lead Developer', line: 'The part I did not expect was how little I had to learn before shipping something real.' },
      { title: 'Priya Raman, Head of Content', line: 'Our writers stopped filing tickets. That alone paid for it.' },
    ],
    icons: ['quote', 'star', 'message-square'],
    image: { shape: 'square', alt: 'Portrait of the person quoted' },
  },

  stats: {
    elements: ['title', 'items'],
    eyebrow: 'By the numbers',
    headline: 'What a year of this looks like',
    records: [
      { title: '12,400', line: 'sites published' },
      { title: '99.98%', line: 'uptime, measured externally' },
      { title: '180ms', line: 'median time to first byte' },
      { title: '43', line: 'countries served' },
    ],
    icons: ['trending-up', 'zap', 'globe'],
  },

  metrics: {
    eyebrow: 'Measured',
    headline: 'The numbers we watch',
    records: [
      { title: '2.1s', line: 'median build time' },
      { title: '94/100', line: 'Lighthouse performance, median page' },
      { title: '0', line: 'servers you run' },
    ],
    icons: ['trending-up', 'zap', 'badge-check'],
  },

  features: {
    eyebrow: 'What you get',
    headline: 'Three things that change how this feels',
    records: [
      { title: 'Write in markdown', line: 'Your content is plain files. It reads fine without us and it always will.' },
      { title: 'Swap the design', line: 'A foundation is code, a site is content. Change one without touching the other.' },
      { title: 'Publish anywhere', line: 'Export to files and host them wherever you already host things.' },
    ],
    icons: ['file-text', 'layers', 'rocket'],
  },

  cta: {
    eyebrow: 'One more thing',
    headline: 'Start with a real page, not a signup form',
    subhead: 'You can have something live before you decide anything',
    sentences: ['Create a site, publish a page, and look at it on your own domain. Then decide.'],
    actions: [{ label: 'Create a site', href: '/signup' }, { label: 'Read the docs first', href: '/docs' }],
    icons: ['arrow-right', 'rocket'],
  },

  contact: {
    elements: ['title', 'paragraphs', 'lists', 'links'],
    eyebrow: 'Get in touch',
    headline: 'Tell us what you are trying to do',
    subhead: 'We answer every message, usually within a day',
    sentences: ['Say a little about the project and we will tell you honestly whether this is the right fit.'],
    bullets: ['hello@example.com', '+1 (555) 010-0000', 'Toronto, Canada'],
    actions: [{ label: 'Send a message', href: '/contact' }],
    icons: ['mail', 'phone', 'map-pin'],
  },

  newsletter: {
    eyebrow: 'Once a month',
    headline: 'What changed, in one short email',
    subhead: 'No campaigns, no drip sequence, one unsubscribe link',
    sentences: ['Release notes and the occasional longer piece. You can read the archive before deciding.'],
    actions: [{ label: 'Subscribe', href: '/subscribe' }, { label: 'Read the archive', href: '/archive' }],
    icons: ['mail', 'sparkles'],
  },

  'code-block': {
    eyebrow: 'Example',
    headline: 'A worked example',
    sentences: ['What the snippet below does, and what to change in it.'],
    snippets: [
      { language: 'js', code: "const site = await uniweb.load('./site.yml')\nconsole.log(site.pages.length)" },
      { language: 'bash', code: 'uniweb build && uniweb export' },
    ],
    elements: ['title', 'paragraphs'],
    icons: ['file-text', 'workflow'],
  },

  article: {
    snippets: [
      { language: 'js', code: "const rows = await db.query('select * from things limit 10')" },
    ],
    elements: ['pretitle', 'title', 'subtitle', 'paragraphs', 'image'],
    eyebrow: 'Engineering',
    headline: 'A title that says what the piece argues',
    subhead: 'And a standfirst that gives away the conclusion',
    sentences: [
      'The opening paragraph of a real article does one job: it convinces someone skimming to start reading properly. Say the surprising thing first.',
      'From there the piece can take its time. This paragraph stands in for the body.',
    ],
    icons: ['file-text', 'book-open'],
    image: { shape: 'wide', alt: 'The article’s lead image' },
  },

  steps: {
    eyebrow: 'Getting set up',
    headline: 'Four steps, about ten minutes',
    records: [
      { title: 'Install the CLI', line: 'One command, and it works on macOS, Linux and Windows.' },
      { title: 'Create a project', line: 'Pick a template; you can change it later.' },
      { title: 'Write a page', line: 'Markdown, with frontmatter for the section type.' },
      { title: 'Publish', line: 'Choose a host, or export the files and take them elsewhere.' },
    ],
    icons: ['workflow', 'list-checks', 'circle-check'],
  },

  process: {
    eyebrow: 'How we work',
    headline: 'Three phases, and what you get from each',
    records: [
      { title: 'Discovery', line: 'Two weeks. You get a written brief and a fixed quote.' },
      { title: 'Build', line: 'Six to ten weeks, in two-week increments you can see.' },
      { title: 'Handover', line: 'Documentation, a training session, and the keys.' },
    ],
    icons: ['workflow', 'compass', 'badge-check'],
  },

  jobs: {
    eyebrow: 'Open roles',
    headline: 'We are hiring for three positions',
    records: [
      { title: 'Senior Backend Engineer', line: 'Remote (EU/UK) · Full time' },
      { title: 'Product Designer', line: 'Toronto or remote · Full time' },
      { title: 'Developer Advocate', line: 'Remote · Contract, 6 months' },
    ],
    actions: [{ label: 'See all roles', href: '/careers' }],
    icons: ['briefcase', 'users', 'map-pin'],
  },

  products: {
    eyebrow: 'The catalogue',
    headline: 'Everything we make',
    records: [
      { title: 'The Standard Desk', line: '$640 · Oak and powder-coated steel' },
      { title: 'The Reading Chair', line: '$980 · Walnut, wool upholstery' },
      { title: 'The Shelf System', line: 'From $310 · Configurable, ships flat' },
      { title: 'The Side Table', line: '$220 · Oak, three finishes' },
    ],
    actions: [{ label: 'Shop all', href: '/shop' }],
    icons: ['package', 'tag', 'star'],
    image: { shape: 'square', alt: 'Product photograph' },
  },

  'logo-cloud': {
    eyebrow: 'Trusted by',
    headline: 'Teams you may have heard of',
    records: [
      { title: 'Northwind', line: '' },
      { title: 'Cyanotype', line: '' },
      { title: 'Halden & Co', line: '' },
      { title: 'Meridian Labs', line: '' },
      { title: 'Foldwork', line: '' },
      { title: 'Ninefold', line: '' },
    ],
    image: { shape: 'square', alt: 'Customer logo' },
    icons: ['badge-check'],
  },

  gallery: {
    elements: ['title', 'paragraphs', 'image'],
    eyebrow: 'Selected work',
    headline: 'A few things worth looking at',
    sentences: ['Captions carry the context a picture cannot.'],
    records: [
      { title: 'Northwind, 2025', line: 'Identity and site' },
      { title: 'Cyanotype, 2024', line: 'Print and packaging' },
      { title: 'Halden & Co, 2024', line: 'Editorial system' },
    ],
    image: { shape: 'landscape', alt: 'Photograph from the series' },
    icons: ['image', 'layers'],
  },

  schedule: {
    eyebrow: 'Programme',
    headline: 'Day one',
    records: [
      { title: '09:30 — Doors and coffee', line: 'Main hall' },
      { title: '10:00 — Opening keynote', line: 'Dr. Rowan Alvarez · Auditorium' },
      { title: '11:15 — Three parallel tracks', line: 'Rooms A, B and C' },
      { title: '13:00 — Lunch', line: 'Courtyard' },
    ],
    actions: [{ label: 'Full programme', href: '/programme' }],
    icons: ['calendar', 'map-pin', 'users'],
  },

  footer: {
    elements: ['title', 'items', 'links'],
    headline: 'Example Company',
    sentences: ['© 2026 Example Company. Made with Uniweb.'],
    actions: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
    records: [
      { title: 'Product', line: 'Features · Pricing · Changelog' },
      { title: 'Developers', line: 'Docs · Reference · Status' },
      { title: 'Company', line: 'About · Careers · Contact' },
    ],
    icons: ['globe', 'mail'],
  },

  header: {
    elements: ['title', 'links'],
    headline: 'Example Company',
    actions: [
      { label: 'Product', href: '/product' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Docs', href: '/docs' },
      { label: 'Sign in', href: '/signin' },
    ],
    image: { shape: 'square', alt: 'Wordmark' },
    icons: ['menu'],
  },

  toc: {
    elements: ['title', 'lists'],
    eyebrow: 'On this page',
    headline: 'Contents',
    bullets: ['What this covers', 'How it works', 'Limitations', 'Where to go next'],
    icons: ['list-checks'],
  },

  map: {
    eyebrow: 'Find us',
    headline: 'Two minutes from Osgoode station',
    sentences: ['361 Example Street, Suite 400, Toronto, ON M5V 2T3.'],
    actions: [{ label: 'Open in Maps', href: 'https://example.com/map' }],
    icons: ['map-pin', 'globe'],
    image: { shape: 'wide', alt: 'Map of the area' },
  },

  video: {
    elements: ['title', 'paragraphs'],
    eyebrow: 'Watch',
    headline: 'Three minutes on what this actually does',
    sentences: ['A transcript is below, because not everyone can or wants to watch.'],
    icons: ['play'],
    image: { shape: 'wide', alt: 'Video poster frame' },
  },
}

/**
 * The register for a component, resolved family → group → generic.
 *
 * @param {string|null} family - a family id, or null for a miss
 * @param {string|null} group  - that family's group, or null
 * @returns {object} a total register — every key present
 */
export function registerFor(family, group) {
  return {
    ...GENERIC,
    ...(group && BY_GROUP[group] ? BY_GROUP[group] : {}),
    ...(family && BY_FAMILY[family] ? BY_FAMILY[family] : {}),
  }
}

export { GENERIC, BY_GROUP, BY_FAMILY }
