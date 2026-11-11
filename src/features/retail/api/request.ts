export async function result<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data as T;
}
export async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const batch = await result<T[]>(page(from, from + 499));
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
