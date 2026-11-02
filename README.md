# selo-eslint-raiz

A `selo` rule pack that wraps three core ESLint rules into the selo contract, plus a generic `shimEslintRule()` helper so you can wrap any other ESLint rule the same way. Companion to [`@guilhermesilveira/selo`](https://github.com/guilhermesilveira/selo).

## Rules

| Rule id | Wraps | What it catches |
|---|---|---|
| `eslint/no-empty` | core `no-empty` (with `allowEmptyCatch: false`) | empty `{}` blocks, including empty catch clauses |
| `eslint/no-useless-catch` | core `no-useless-catch` | `catch (e) { throw e; }` patterns that hide nothing and serve no purpose |
| `eslint/object-curly-newline-imports` | core `object-curly-newline` (with `ImportDeclaration: 'never'`) | multi-line `import { ... }` declarations |

All three are **count rules** under the selo contract: each violation produces one `value: 1` measurement. Histograms aren't meaningful for them; ratchet works on `violationsVsGoal` (count) only.

## Install

```sh
npm install --save-dev @guilhermesilveira/selo selo-eslint-raiz
```

## Use

In `selo.config.mjs`:

```js
import eslintRaiz from 'selo-eslint-raiz';

export default {
  packs: [eslintRaiz],
  rules: {
    'eslint/no-empty':                     { goal: 0 },
    'eslint/no-useless-catch':             { goal: 0 },
    'eslint/object-curly-newline-imports': { goal: 0 },
  },
};
```

For count rules, `goal: 0` is the natural target — fewer violations is always better. Goal could be set to a non-zero number if you want to land the rule with a tolerance budget; the ratchet will tighten down toward zero from the seeded current.

## How the shim works

The exported built-in pack batches its independent rules into one ESLint verification
per file, caching only diagnostic messages in a `WeakMap` for that invocation.
Conservative AST eligibility checks skip verification for `no-empty` and
`no-useless-catch` only when no node capable of triggering the rule exists.
ESLint still owns options, inline directives, exact diagnostics and locations.

A compatible engine-prepared parse is reused when its parser version, source and
JSX mode match. Older engines or incompatible metadata fall back to the original
parser. The standalone `shimEslintRule()` helper remains isolated, and the host
project's ESLint config is never loaded. No data is cached between invocations.

## Adding a new ESLint rule

Each of the three rule files in `src/rules/` is a single call to `shimEslintRule()`. To add a new core ESLint rule, copy one of them:

```ts
// src/rules/eslintNoDebugger.ts
import { shimEslintRule } from '../lib/shim.js';

export const eslintNoDebugger = shimEslintRule({
  id: 'eslint/no-debugger',
  description: 'Forbid `debugger` statements.',
  unitLabel: 'debuggers',
  seal: '`debugger` at line {{line}}. Remove it before committing.',
  eslintRuleId: 'no-debugger',
});
```

Then export it from `src/index.ts`:

```ts
import { eslintNoDebugger } from './rules/eslintNoDebugger.js';

export const seloEslintRaiz: SeloRulePack = {
  // ...
  rules: {
    // ...
    'eslint/no-debugger': eslintNoDebugger,
  },
};
```

That's it — no extra wiring, no schema declaration. The seal message gets `{{line}}`, `{{message}}`, and `{{ruleId}}` from the underlying ESLint diagnostic.

### Wrapping non-core ESLint rules

The shim only registers the rule, not the plugin that defines it. To wrap a community-plugin rule, the pattern is the same but you need to load the plugin into the shim's `Linter` instance. That's a small extension to `shimEslintRule()` (add a `plugin` + `pluginName` option, register it in the `verify()` config). This is intentionally out of scope for `eslint-raiz` — keeping this pack core-only avoids dragging external plugin deps into selo's tree. If you need to wrap a plugin rule, fork the helper or build a separate `selo-eslint-<plugin>-raiz` pack.

## Releasing

Manual SemVer release flow. See [@guilhermesilveira/selo's release notes](https://github.com/guilhermesilveira/selo#releasing) for the engine-releases-first ordering — when `@guilhermesilveira/selo`'s contract changes, the engine ships first, then this pack bumps its peer range and follows.

```sh
# 1. Move [Unreleased] in CHANGELOG.md under a new
#    `## [<version>] — YYYY-MM-DD` heading.
# 2. If the engine bumped, update peerDependencies."@guilhermesilveira/selo"
#    in package.json.
# 3. npm version patch        # 0.0.1 → 0.0.2 (or `minor` / `major`)
# 4. git push --follow-tags
# 5. npm publish               # one-time `npm login` first
```

The `prepublishOnly` script gates publishing on a clean build + tests + lint, so a broken state can't ship.

---

## Layout

```
src/
  lib/shim.ts                       shimEslintRule() — the wrapping helper
  rules/eslintNoEmpty.ts            shim for `no-empty`
  rules/eslintNoUselessCatch.ts     shim for `no-useless-catch`
  rules/eslintObjectCurlyNewline.ts shim for `object-curly-newline` (imports)
  index.ts                          pack export
tests/
  helpers.ts                        fixtureFile() — parse + set parents
  shim.test.ts                      shim helper itself
  eslint*.test.ts                   one focused test per rule
```
