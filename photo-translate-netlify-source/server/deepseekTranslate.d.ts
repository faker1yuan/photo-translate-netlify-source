export function createDeepSeekMiddleware(
  env: Record<string, string | undefined>,
): (req: unknown, res: unknown, next: () => void) => Promise<void>

export function handleDeepSeekTranslateRequest(
  req: unknown,
  res: unknown,
  env?: Record<string, string | undefined>,
): Promise<void>
