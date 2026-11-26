import { useCallback, useRef, useState } from "react";

type AsyncActionOptions = {
  keepBusyOnSuccess?: boolean;
};

// Synchronous double-tap latch plus error holder for form/sheet mutations.
// `lockRef` blocks same-frame re-entry before React commits `submitting`;
// `keepBusyOnSuccess` keeps controls locked during post-submit dismissal.
export const useAsyncAction = (options?: AsyncActionOptions) => {
  const lockRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepBusyOnSuccess = options?.keepBusyOnSuccess === true;

  const run = useCallback(
    async (action: () => Promise<void>, fallbackMessage = "Action failed.") => {
      if (lockRef.current) {
        return false;
      }

      lockRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        await action();
        if (!keepBusyOnSuccess) {
          lockRef.current = false;
          setSubmitting(false);
        }
        return true;
      } catch (err) {
        console.error(err);
        setError(fallbackMessage);
        lockRef.current = false;
        setSubmitting(false);
        return false;
      }
    },
    [keepBusyOnSuccess],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    lockRef.current = false;
    setSubmitting(false);
    setError(null);
  }, []);

  return { submitting, error, run, clearError, reset };
};
