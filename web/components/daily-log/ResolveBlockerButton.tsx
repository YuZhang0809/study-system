"use client";

import { useState, useTransition } from "react";
import { resolveBlocker } from "@/lib/daily-log/actions";

interface ResolveBlockerButtonProps {
  id: string;
}

export function ResolveBlockerButton({ id }: ResolveBlockerButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);

    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    try {
      const result = await resolveBlocker({ id });

      if (!result.ok) {
        setError(result.fieldErrors?.id?.[0] ?? "操作失败。");
      }
    } catch {
      setError("操作失败。");
    }
  }

  return (
    <div className="daily-action-stack">
      <button
        type="button"
        className="btn daily-action-button"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "处理中…" : "解除"}
      </button>
      {error ? <p className="daily-log-error">{error}</p> : null}
    </div>
  );
}
