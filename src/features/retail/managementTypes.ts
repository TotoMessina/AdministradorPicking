export type Run = (
  action: () => Promise<unknown>,
  message?: string,
) => Promise<boolean>;
