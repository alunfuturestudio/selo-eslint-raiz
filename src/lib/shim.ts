import type { SeloMeasurement, SeloRule } from '@guilhermesilveira/selo';
import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

/**
 * Options for `shimEslintRule()`. Wraps a single ESLint rule into a
 * SeloRule whose `measure()` runs ESLint on the file's source and emits
 * one `value: 1` measurement per produced violation.
 *
 * The wrapped rule is run in isolation: ESLint's Linter instance has
 * only that rule enabled (and only the supplied plugins, if any). The
 * project's own ESLint config is *not* loaded — selo and ESLint are
 * deliberately decoupled. This makes the shim deterministic and
 * independent of how the host project happens to configure things.
 */
export interface ShimOptions {
  /** The selo rule id, e.g. `eslint/no-empty`. */
  id: string;
  /** Short description shown in `selo packs`-style listings. */
  description: string;
  /** Histogram unit label (count rules don't really use it, but the contract requires one). */
  unitLabel: string;
  /**
   * Seal message template. `{{message}}` interpolates the underlying
   * ESLint message; `{{line}}` and `{{ruleId}}` are also available.
   */
  seal: string;
  /** ESLint rule id as it appears in eslint config (e.g. `no-empty`, `no-useless-catch`). */
  eslintRuleId: string;
  /** Default ESLint rule options, including the severity. */
  eslintRuleConfig?: unknown;
}

const linter = new Linter();

export function shimEslintRule(opts: ShimOptions): SeloRule {
  const ruleConfig = opts.eslintRuleConfig ?? 'error';
  return {
    meta: {
      id: opts.id,
      description: opts.description,
      type: 'count',
      unitLabel: opts.unitLabel,
      seal: opts.seal,
    },
    measure(file: { path: string; source: string }): SeloMeasurement[] {
      const isJsx = file.path.endsWith('.tsx') || file.path.endsWith('.jsx');
      let messages;
      try {
        // We omit the filename argument from `linter.verify`: ESLint's
        // flat-config `files` globbing fails on bare filenames, and selo
        // doesn't need ESLint to know the path — `file.path` is already
        // in the measurement.
        messages = linter.verify(file.source, {
          languageOptions: {
            parser: tsParser as Linter.Parser,
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module',
              ecmaFeatures: isJsx ? { jsx: true } : undefined,
            },
          },
          rules: {
            [opts.eslintRuleId]: ruleConfig as Linter.RuleEntry,
          },
        });
      } catch {
        return [];
      }
      return messages
        .filter((m) => m.ruleId === opts.eslintRuleId)
        .map((m) => ({
          value: 1,
          file: file.path,
          startLine: m.line,
          data: {
            line: m.line,
            message: m.message,
            ruleId: m.ruleId ?? opts.eslintRuleId,
          },
        }));
    },
  };
}
