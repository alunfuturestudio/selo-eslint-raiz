# Changelog

All notable changes to `selo-eslint-raiz` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/) — pre-1.0 the contract is allowed to break in `MINOR` bumps.

## [Unreleased]

_Nothing yet._

## [0.0.1] — Initial release

Three core ESLint rules wrapped into the [`@guilhermesilveira/selo`](https://github.com/guilhermesilveira/selo) `SeloRule` contract:

- `eslint/no-empty` (with `allowEmptyCatch: false`)
- `eslint/no-useless-catch`
- `eslint/object-curly-newline-imports` (with `ImportDeclaration: 'never'`)

Plus the generic `shimEslintRule()` helper so any other ESLint rule can be wrapped with the same pattern. Internally the shim spins up an isolated ESLint `Linter`, configures only the wrapped rule, runs `verify()` on the file's source, and emits one `value: 1` measurement per produced violation. The host project's ESLint config is *not* loaded — selo and ESLint stay decoupled, the verdict is reproducible across machines.
