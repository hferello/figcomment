export function isProviderCredentialError(error: unknown): boolean {
  return hasStatus(error, [400, 401, 403]);
}

export function isProviderRateLimitError(error: unknown): boolean {
  return hasStatus(error, [429]);
}

export function isProviderUnavailableError(error: unknown): boolean {
  return hasStatus(error, [500, 502, 503, 504]);
}

function hasStatus(error: unknown, statuses: number[]): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (!("statusCode" in error) && !("status" in error)) {
    return false;
  }
  const status = Number(
    (error as Record<string, unknown>).statusCode ??
      (error as Record<string, unknown>).status,
  );
  return statuses.includes(status);
}
