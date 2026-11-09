export type FakeResult = { data?: unknown; error?: unknown };

const CHAIN_METHODS = [
  ...["select", "insert", "upsert", "update", "delete"],
  ...["eq", "neq", "in", "gte", "lte", "order", "range", "single", "maybeSingle"],
];

// Records every call; each awaited query or rpc takes the next queued result for its table (or "rpc:name").
export function fakeSupabase(results: Record<string, FakeResult[]>) {
  const calls: unknown[][] = [];
  const next = (key: string) => Promise.resolve(results[key]?.shift() ?? { data: null, error: null });
  const client = {
    from(table: string) {
      calls.push(["from", table]);
      const chain: Record<string, unknown> = {
        then: (resolve: (value: FakeResult) => unknown, reject: (reason: unknown) => unknown) =>
          next(table).then(resolve, reject),
      };
      for (const method of CHAIN_METHODS) {
        chain[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return chain;
        };
      }
      return chain;
    },
    rpc(name: string, args: unknown) {
      calls.push(["rpc", name, args]);
      return next(`rpc:${name}`);
    },
  };
  return { client, calls };
}
