import type { FlattenedComment } from "./pii-redact";

export const MAX_COMMENTS_PER_REQUEST = 36;
export const MAX_COMMENT_CHARS_FOR_CLASSIFICATION = 500;
export const MAX_AI_BATCHES = 3;

export function enforceCommentCountLimit(comments: FlattenedComment[]): void {
  if (comments.length > MAX_COMMENTS_PER_REQUEST) {
    throw new Error("too_many_comments");
  }
}

export function truncateForClassification(text: string): string {
  if (text.length <= MAX_COMMENT_CHARS_FOR_CLASSIFICATION) {
    return text;
  }
  return text.slice(0, MAX_COMMENT_CHARS_FOR_CLASSIFICATION);
}

export function truncateCommentsForClassification(
  comments: FlattenedComment[],
): FlattenedComment[] {
  return comments.map((comment) => ({
    person: comment.person,
    feedback: truncateForClassification(comment.feedback),
  }));
}

export function splitIntoBatches<T>(items: T[], batch_count: number): T[][] {
  if (items.length === 0) {
    return [];
  }
  const safe_count = Math.max(1, Math.min(batch_count, items.length));
  const bucket_size = Math.ceil(items.length / safe_count);
  const buckets: T[][] = [];
  for (let index = 0; index < items.length; index += bucket_size) {
    buckets.push(items.slice(index, index + bucket_size));
  }
  return buckets;
}
