# selo-eslint-raiz

A `selo` rule pack that wraps four core ESLint rules into the selo contract, plus a generic `shimEslintRule()` helper so you can wrap any other ESLint rule the same way. Companion to [`@guilhermesilveira/selo`](https://github.com/guilhermesilveira/selo).

## Rules

| Rule id | Wraps | What it catches |
|---|---|---|
| `eslint/no-empty` | core `no-empty` (with `allowEmptyCatch: false`) | empty `{}` blocks, including empty catch clauses |
| `eslint/no-nested-ternary` | core `no-nested-ternary` | ternary expressions nested inside another ternary |
| `eslint/no-useless-catch` | core `no-useless-catch` | `catch (e) { throw e; }` patterns that hide nothing and serve no purpose |
| `eslint/object-curly-newline-imports` | core `object-curly-newline` (with `ImportDeclaration: 'never'`) | multi-line `import { ... }` declarations |

All four are **count rules** under the selo contract: each violation produces one `value: 1` measurement. Histograms aren't meaningful for them; ratchet works on `violationsVsGoal` (count) only.

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
    'eslint/no-nested-ternary':            { goal: 0 },
    'eslint/no-useless-catch':             { goal: 0 },
    'eslint/object-curly-newline-imports': { goal: 0 },
  },
};
```

For count rules, `goal: 0` is the natural target — fewer violations is always better. Goal could be set to a non-zero number if you want to land the rule with a tolerance budget; the ratchet will tighten down toward zero from the seeded current. `eslint/no-nested-ternary` in particular is the kind of rule you may want to seed at the current count and let the ratchet tighten over time, rather than trying to fix every offender in one go.

## How the shim works

Each rule in this pack is built by `shimEslintRule({...})`, which spins up an isolated ESLint `Linter`, configures *only* the wrapped rule, runs the file through it, and emits one selo measurement per violation. The mechanism in one paragraph:

1. selo's engine parses the file and hands the rule a `SeloFile` with `path`, `source`, and the parsed AST.
2. The shim ignores the AST (re-parsing is cheap; ESLint will do it again with `@typescript-eslint/parser`) and calls `linter.verify(source, {...})` with a tiny flat config that loads the wrapped rule and its options.
3. Each `LintMessage` whose `ruleId` matches the wrapped rule becomes a `SeloMeasurement` with `value: 1`, the line number, and the rendered ESLint message in `data.message`.
4. selo's seal-message rendering takes over from there — the message in `data` flows into the rule's `seal` template at offender-listing time.

Importantly, the shim does **not** load the host project's ESLint config. The wrapped rule runs in isolation with the options the shim authored. This keeps selo and ESLint deliberately decoupled — you don't have to keep two configs in sync, and the verdict is reproducible across machines.

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
  rules/eslintNoNestedTernary.ts    shim for `no-nested-ternary`
  rules/eslintNoUselessCatch.ts     shim for `no-useless-catch`
  rules/eslintObjectCurlyNewline.ts shim for `object-curly-newline` (imports)
  index.ts                          pack export
tests/
  helpers.ts                        fixtureFile() — parse + set parents
  shim.test.ts                      shim helper itself
  eslint*.test.ts                   one focused test per rule
```
