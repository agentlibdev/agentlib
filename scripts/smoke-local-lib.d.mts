export function resolveAgentCliDir(
  projectRoot: string,
  env?: Record<string, string | undefined>
): string;

export function resolveSmokeRef(env?: Record<string, string | undefined>): string;

export function createCliSmokeEnv(
  env?: Record<string, string | undefined>
): Record<string, string | undefined>;
