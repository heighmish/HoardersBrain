export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "missing" }
  | { status: "ready"; data: T };

type LiveQueryLike<T> = {
  data: T | undefined;
  error?: Error;
  updatedAt?: Date;
};

/**
 * Maps a Drizzle live query result onto an explicit state machine.
 *
 * The `matchesId` guard covers the window where a live query still holds the
 * previous row while the id prop has already changed.
 */
export const toQueryState = <T>(
  query: LiveQueryLike<T>,
  matchesId: (row: T) => boolean,
): QueryState<T> => {
  if (query.error !== undefined) {
    return {
      status: "error",
      error:
        query.error instanceof Error
          ? query.error
          : new Error(String(query.error)),
    };
  }

  if (query.updatedAt === undefined) {
    return { status: "loading" };
  }

  if (query.data === undefined) {
    return { status: "missing" };
  }

  if (!matchesId(query.data)) {
    return { status: "loading" };
  }

  return { status: "ready", data: query.data };
};
