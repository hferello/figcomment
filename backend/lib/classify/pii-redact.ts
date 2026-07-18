/**
 * Ephemeral PII tokenization before Anthropic — request-scoped only, never persisted.
 * Intent: redact emails, phones, URLs, and author names from classify prompts.
 */

export type FlattenedComment = {
  person: string;
  feedback: string;
};

export type PiiTokenMap = Map<string, string>;

const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g;
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/**
 * Replace sensitive substrings with stable placeholders for the LLM prompt.
 */
export function redactCommentsForPrompt(
  comments: FlattenedComment[],
): { redacted: FlattenedComment[]; token_map: PiiTokenMap } {
  const token_map: PiiTokenMap = new Map();
  let email_counter = 0;
  let phone_counter = 0;
  let url_counter = 0;
  let person_counter = 0;
  const person_aliases = new Map<string, string>();

  const redacted = comments.map((comment) => {
    let feedback = comment.feedback;

    feedback = feedback.replace(EMAIL_PATTERN, (match) => {
      const placeholder = `[EMAIL_${++email_counter}]`;
      token_map.set(placeholder, match);
      return placeholder;
    });

    feedback = feedback.replace(PHONE_PATTERN, (match) => {
      if (match.replace(/\D/g, "").length < 7) {
        return match;
      }
      const placeholder = `[PHONE_${++phone_counter}]`;
      token_map.set(placeholder, match);
      return placeholder;
    });

    feedback = feedback.replace(URL_PATTERN, (match) => {
      const placeholder = `[URL_${++url_counter}]`;
      token_map.set(placeholder, match);
      return placeholder;
    });

    const person_key = comment.person.trim() || "Unknown";
    let person_alias = person_aliases.get(person_key);
    if (!person_alias) {
      person_counter += 1;
      person_alias = `Person_${person_counter}`;
      person_aliases.set(person_key, person_alias);
      token_map.set(person_alias, person_key);
    }

    return {
      person: person_alias,
      feedback,
    };
  });

  return { redacted, token_map };
}

/**
 * Restore original PII in classify output rows using the request-local map.
 */
export function detokenizeClassifiedRows<T extends { person: string; feedback: string }>(
  rows: T[],
  token_map: PiiTokenMap,
): T[] {
  if (token_map.size === 0) {
    return rows;
  }

  return rows.map((row) => ({
    ...row,
    person: detokenizeString(row.person, token_map),
    feedback: detokenizeString(row.feedback, token_map),
  }));
}

function detokenizeString(value: string, token_map: PiiTokenMap): string {
  let result = value;

  for (const [placeholder, original] of token_map.entries()) {
    if (result.includes(placeholder)) {
      result = result.split(placeholder).join(original);
    }
  }

  return result;
}
