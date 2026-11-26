import { useCallback, useRef, useState } from "react";

type AsyncActionOptions = {
  keepBusyOnSuccess?: boolean;
};

// `lockRef` blocks same-frame double-taps before React commits `submitting`.
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

  return { submitting, error, run, clearError };
};
