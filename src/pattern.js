/**
 * A `string` field's `pattern` — which ones a registry reads, and how a value is matched.
 *
 * ⭐ A pattern is written in the syntax a registry's engine and JavaScript read the same way
 * [ruled 2026-10-15: "no lookarounds or back-references"]. A value matches when
 * `new RegExp('^(?:' + pattern + ')$', 'v')` matches it — or the same with the `u` flag, which reads
 * that syntax alike — so a pattern matches the WHOLE value: `[0-9]{4}` is four digits, not four
 * digits somewhere.
 *
 * `patternRefusal` answers, at build, what a registry answers at register: the rest of regular
 * expression syntax is refused, each construct with its reason, so a developer learns it before a
 * register does. ⚠️ What it does not measure is size: a registry also refuses a pattern that compiles
 * too large to keep, and only it can say which one does.
 *
 * A leaf: no imports, so an editor can check a value with the same rule before it saves.
 */

// Characters with a meaning of their own outside a class: written escaped, `\.`, to mean themselves.
const SYNTAX = new Set(['^', '$', '\\', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|'])
// Inside a class, the `v` flag reads these as syntax, so they are written escaped there.
const CLASS_SYNTAX = new Set(['(', ')', '[', ']', '{', '}', '/', '-', '\\', '|'])
// Doubled inside a class, the `v` flag reserves these: `&&`, `--` and `~~` combine classes in some
// engines, and the rest are kept for later syntax.
const RESERVED_DOUBLES = new Set(['&', '-', '~', '!', '#', '$', '%', '*', '+', ',', '.', ':', ';', '<', '=', '>', '?', '@', '^', '`'])
const SET_ESCAPES = new Set(['d', 'D', 'w', 'W', 's', 'S'])
const CONTROL_ESCAPES = { t: 0x09, n: 0x0a, v: 0x0b, f: 0x0c, r: 0x0d }

const LOOK_AROUND = 'uses look-around — `(?=…)`, `(?!…)`, `(?<=…)`, `(?<!…)` — which a registry’s engine does not have'
const NAMED_GROUP = 'names a group — a pattern only checks a value, so write `( … )` or `(?: … )`'
const FLAG = 'sets a flag, as in `(?i)`, and a pattern takes none — write the letters a class holds, as in `[Aa]`'
const BACK_REFERENCE = 'refers back to a group, as in `\\1`, which a registry’s engine does not have'
const PROPERTY = 'uses a Unicode property class such as `\\p{L}`, whose names the engines spell differently — list the characters as a class'
const POSIX = 'uses a POSIX class such as `[[:alpha:]]`, which JavaScript does not read — list the characters, as in `[A-Za-z]`'
const NESTED = 'puts a class inside a class, which the engines read differently — write `\\[` for a bracket'
const SET_OPERATION = 'combines classes with `&&`, `--` or `~~`, which the engines read differently — list the characters the class holds'
const REPEATED = 'repeats a repetition, as in `a**` or `a{2}{3}`, which JavaScript refuses — group it first, as in `(?:a*)*`'
const REPEATED_ANCHOR = 'repeats an anchor or a word boundary, as in `^*`, which JavaScript refuses'

const anchor = (written) =>
  `uses \`${written}\`, which JavaScript does not read — a pattern matches the whole value, so it needs no anchor but \`^\` and \`$\``
const unread = (written) =>
  `writes \`${written}\`, an escape JavaScript does not read — write the character itself, or \`\\xHH\`, \`\\uHHHH\` or \`\\u{…}\``

class Refusal extends Error {}
function refuse(why) {
  throw new Refusal(why)
}

// The `v` flag reads every pattern a registry accepts as `u` does; an engine without it uses `u`.
const FLAGS = (() => {
  try {
    new RegExp('', 'v')
    return ['v', 'u']
  } catch {
    return ['u']
  }
})()

/**
 * Why a registry refuses this pattern, or `null` when it reads it — at build, before a register.
 *
 * @param {string} source - the pattern as a data schema writes it, with no slashes and no flags
 * @returns {string|null} the reason, worded to follow the pattern: `"(?=a)" uses look-around …`
 */
export function patternRefusal(source) {
  if (typeof source !== 'string' || source === '') {
    return 'is not a regular expression — write one, as in "[A-Z]{2}[0-9]{4}"'
  }
  try {
    const p = { cs: [...source], i: 0 }
    disjunction(p, false)
  } catch (err) {
    if (err instanceof Refusal) return err.message
    throw err
  }
  // Every construct above is read alike by both flags; this catches what the walk does not model.
  for (const flag of FLAGS) {
    try {
      new RegExp(`^(?:${source})$`, flag)
    } catch (err) {
      return `is not a regular expression JavaScript reads (${err.message})`
    }
  }
  return null
}

const compiled = new Map()

/**
 * Does this value match the pattern — whole, as a registry matches it? The pattern is one
 * `patternRefusal` accepts; a data schema's always is, since normalizing it refuses the rest.
 *
 * @param {string} source - the field's `pattern`
 * @param {string} value - the value; a registry checks no empty one, and neither should a caller
 * @returns {boolean}
 */
export function matchesPattern(source, value) {
  let re = compiled.get(source)
  if (!re) {
    re = new RegExp(`^(?:${source})$`, FLAGS[0])
    compiled.set(source, re)
  }
  return re.test(value)
}

// ── The walk ────────────────────────────────────────────────────────────────
// `p.cs` is the pattern as code points, so a character outside the BMP is one character, as both
// flags read it; `p.i` is the position.

function disjunction(p, inGroup) {
  for (;;) {
    while (p.i < p.cs.length && p.cs[p.i] !== '|' && p.cs[p.i] !== ')') term(p)
    if (p.cs[p.i] !== '|') break
    p.i++
  }
  if (p.cs[p.i] === ')') {
    if (!inGroup) refuse('closes a group with a `)` it never opened — write `\\)` for a parenthesis')
    return
  }
  if (inGroup) refuse('opens a group with a `(` it never closes')
}

function term(p) {
  const c = p.cs[p.i]
  const next = p.cs[p.i + 1]
  if (c === '^' || c === '$') {
    p.i++
    if (startsQuantifier(p)) refuse(REPEATED_ANCHOR)
    return
  }
  if (c === '\\' && (next === 'b' || next === 'B')) {
    p.i += 2
    if (next === 'b' && p.cs[p.i] === '{' && /[A-Za-z]/.test(p.cs[p.i + 1] ?? '')) {
      refuse(anchor(`\\b{${readUntil(p, p.i + 1, '}')}}`))
    }
    if (startsQuantifier(p)) refuse(REPEATED_ANCHOR)
    return
  }
  if (c === '*' || c === '+' || c === '?') refuse(`repeats nothing — \`${c}\` follows what it repeats`)
  if (c === '{') refuse(braceQuantifier(p) ? 'repeats nothing — `{…}` follows what it repeats' : 'writes `{` on its own, which JavaScript refuses — write `\\{`')
  if (c === '}') refuse('writes `}` on its own, which JavaScript refuses — write `\\}`')
  if (c === ']') refuse('writes `]` on its own, which JavaScript refuses — write `\\]`')

  if (c === '(') group(p)
  else if (c === '[') charClass(p)
  else if (c === '\\') escape(p, false)
  else p.i++ // `.`, or a character as written

  // A quantifier, then `?` to make it lazy — and nothing repeats it again.
  if (readQuantifier(p)) {
    if (p.cs[p.i] === '?') p.i++
    if (startsQuantifier(p)) refuse(REPEATED)
  }
}

function group(p) {
  p.i++ // (
  if (p.cs[p.i] === '?') {
    const a = p.cs[p.i + 1]
    const b = p.cs[p.i + 2]
    if (a === ':') p.i += 2
    else if (a === '=' || a === '!' || (a === '<' && (b === '=' || b === '!'))) refuse(LOOK_AROUND)
    else if (a === '<' || a === 'P' || a === "'") refuse(NAMED_GROUP)
    else if (/[A-Za-z-]/.test(a ?? '')) refuse(FLAG)
    else refuse('writes `(?`, which only `(?:` begins — write `( … )` or `(?: … )`')
  }
  disjunction(p, true)
  p.i++ // )
}

function charClass(p) {
  p.i++ // [
  if (p.cs[p.i] === '^') p.i++
  if (p.cs[p.i] === ']') refuse('writes `]` unescaped inside a class, which JavaScript’s `v` flag reads as syntax — write `\\]`')
  for (;;) {
    if (p.i >= p.cs.length) refuse('opens a class with a `[` it never closes')
    if (p.cs[p.i] === ']') {
      p.i++
      return
    }
    reservedDouble(p)
    const lo = classAtom(p)
    // A range: two characters and a `-` between them. A `-` before the `]` ends no range.
    if (p.cs[p.i] === '-' && p.cs[p.i + 1] !== undefined && p.cs[p.i + 1] !== ']') {
      reservedDouble(p)
      p.i++
      const hi = classAtom(p)
      if (lo.set || hi.set) refuse('makes a range of `\\d`, `\\w` or `\\s`, which are not characters — a range’s ends are characters, as in `0-9`')
      if (lo.cp > hi.cp) refuse('has a range from a higher character to a lower one')
    }
  }
}

function classAtom(p) {
  const c = p.cs[p.i]
  if (c === '\\') return escape(p, true)
  if (c === '[') refuse(p.cs[p.i + 1] === ':' ? POSIX : NESTED)
  if (c === '-') refuse('writes a `-` that ends no range inside a class, which JavaScript’s `v` flag reads as syntax — write `\\-`')
  if (CLASS_SYNTAX.has(c)) refuse(`writes \`${c}\` unescaped inside a class, which JavaScript’s \`v\` flag reads as syntax — write \`\\${c}\``)
  p.i++
  return { cp: c.codePointAt(0) }
}

function reservedDouble(p) {
  const c = p.cs[p.i]
  if (c === undefined || p.cs[p.i + 1] !== c || !RESERVED_DOUBLES.has(c)) return
  if (c === '&' || c === '-' || c === '~') refuse(SET_OPERATION)
  refuse(`writes \`${c}${c}\` inside a class, which JavaScript’s \`v\` flag reserves — write \`${c}\` once`)
}

// An escape: `{ cp }` for one character, `{ set: true }` for `\d` `\w` `\s` and their negations.
function escape(p, inClass) {
  const e = p.cs[p.i + 1]
  if (e === undefined) refuse('ends with a `\\` that escapes nothing')
  if (SYNTAX.has(e) || e === '/' || (inClass && e === '-')) {
    p.i += 2
    return { cp: e.codePointAt(0) }
  }
  if (SET_ESCAPES.has(e)) {
    p.i += 2
    return { set: true }
  }
  if (CONTROL_ESCAPES[e] !== undefined) {
    p.i += 2
    return { cp: CONTROL_ESCAPES[e] }
  }
  if (e === 'x') {
    const hex = p.cs.slice(p.i + 2, p.i + 4).join('')
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      p.i += 4
      return { cp: parseInt(hex, 16) }
    }
    refuse(unread(p.cs[p.i + 2] === '{' ? `\\x{${readUntil(p, p.i + 3, '}')}}` : '\\x'))
  }
  if (e === 'u') return unicodeEscape(p)
  if (e === 'b' && inClass) refuse('writes `\\b` inside a class, which the engines read differently — write `\\x08` for a backspace')
  if (e === 'p' || e === 'P') refuse(PROPERTY)
  if (e === 'k' || (e >= '1' && e <= '9')) refuse(BACK_REFERENCE)
  if (e === '0') refuse('writes `\\0`, which the engines read differently — write `\\x00` for the character')
  if (e === 'c') refuse('writes a control escape, as in `\\cA`, which a registry’s engine does not read — write `\\xHH`')
  if ('AzZG<>'.includes(e)) refuse(anchor(`\\${e}`))
  if (e === '-') refuse('escapes `-` outside a class, which JavaScript refuses — write `-`')
  refuse(unread(e === 'U' ? `\\U${p.cs.slice(p.i + 2, p.i + 10).join('')}` : `\\${e}`))
}

function unicodeEscape(p) {
  let cp
  let end
  if (p.cs[p.i + 2] === '{') {
    const close = p.cs.indexOf('}', p.i + 3)
    const hex = close > 0 ? p.cs.slice(p.i + 3, close).join('') : ''
    if (!/^[0-9A-Fa-f]{1,6}$/.test(hex) || parseInt(hex, 16) > 0x10ffff) refuse(unread(`\\u{${hex}}`))
    cp = parseInt(hex, 16)
    end = close + 1
  } else {
    const hex = p.cs.slice(p.i + 2, p.i + 6).join('')
    if (!/^[0-9A-Fa-f]{4}$/.test(hex)) refuse(unread(`\\u${hex}`))
    cp = parseInt(hex, 16)
    end = p.i + 6
  }
  if (cp >= 0xd800 && cp <= 0xdfff) {
    refuse(`writes \`${p.cs.slice(p.i, end).join('')}\`, half of a character — write the character, or \`\\u{…}\` with its code point`)
  }
  p.i = end
  return { cp }
}

// `{n}`, `{n,}` or `{n,m}` at the position — `{ min, max, end }` — or null.
function braceQuantifier(p) {
  if (p.cs[p.i] !== '{') return null
  const close = p.cs.indexOf('}', p.i)
  const m = close < 0 ? null : /^\{(\d+)(,(\d*))?\}$/.exec(p.cs.slice(p.i, close + 1).join(''))
  if (!m) return null
  return { min: Number(m[1]), max: m[2] === undefined ? Number(m[1]) : m[3] === '' ? Infinity : Number(m[3]), end: close + 1 }
}

function startsQuantifier(p) {
  const c = p.cs[p.i]
  return c === '*' || c === '+' || c === '?' || braceQuantifier(p) !== null
}

function readQuantifier(p) {
  const c = p.cs[p.i]
  if (c === '*' || c === '+' || c === '?') {
    p.i++
    return true
  }
  if (c !== '{') return false
  const q = braceQuantifier(p)
  if (!q) refuse('writes a `{` that begins no repetition — a repetition is `{n}`, `{n,}` or `{n,m}`, and a brace is `\\{`')
  if (q.min > q.max) refuse('repeats from more to fewer, as in `{3,2}`')
  p.i = q.end
  return true
}

function readUntil(p, from, close) {
  const at = p.cs.indexOf(close, from)
  return p.cs.slice(from, at < 0 ? p.cs.length : at).join('')
}
