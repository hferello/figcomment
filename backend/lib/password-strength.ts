/**
 * Password strength estimation via zxcvbn-ts.
 * Entropy-based scoring beats rigid "must include a symbol" rules (NIST 800-63B).
 * Dictionaries load lazily so login never pays the bundle cost.
 */

import type { ZxcvbnFactory, ZxcvbnResult } from "@zxcvbn-ts/core";

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthLabel =
  | "Too weak"
  | "Weak"
  | "Fair"
  | "Strong"
  | "Very strong";

const STRENGTH_LABELS: Record<PasswordStrengthScore, PasswordStrengthLabel> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very strong",
};

let factory_promise: Promise<ZxcvbnFactory> | null = null;

/**
 * Lazily builds a shared zxcvbn factory with common + English dictionaries.
 */
function getZxcvbnFactory(): Promise<ZxcvbnFactory> {
  if (!factory_promise) {
    factory_promise = (async () => {
      const [{ ZxcvbnFactory }, common, en] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-en"),
      ]);

      return new ZxcvbnFactory({
        dictionary: {
          ...common.dictionary,
          ...en.dictionary,
          // Product-specific tokens so "figcomment" etc. score poorly as passwords.
          userInputs: ["figcomment", "figma", "plugin"],
        },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
        useLevenshteinDistance: true,
      });
    })();
  }

  return factory_promise;
}

/**
 * Estimates how guessable a password is. Pass email/username so personal data
 * is treated as a weak pattern.
 */
export async function estimatePasswordStrength(
  password: string,
  user_inputs: string[] = [],
): Promise<ZxcvbnResult> {
  const zxcvbn = await getZxcvbnFactory();
  return zxcvbn.check(password, user_inputs);
}

export function getPasswordStrengthLabel(
  score: PasswordStrengthScore,
): PasswordStrengthLabel {
  return STRENGTH_LABELS[score];
}

export function isPasswordStrengthScore(
  value: number,
): value is PasswordStrengthScore {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}
