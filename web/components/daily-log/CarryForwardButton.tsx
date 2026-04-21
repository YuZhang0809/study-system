"use client";

import { useState, useTransition } from "react";
import { carryForwardYesterdayPromise } from "@/lib/daily-log/actions";

interface CarryForwardButtonProps {
  projectId: string;
}

export function CarryForwardButton({ projectId }: CarryForwardButtonProps) {
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
      const result = await carryForwardYesterdayPromise({ projectId });

      if (!result.ok) {
        setError(result.fieldErrors?._form?.[0] ?? result.fieldErrors?.projectId?.[0] ?? "操作失败。");
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
        {isPending ? "处理中…" : "记为未清账"}
      </button>
      {error ? <p className="daily-log-error">{error}</p> : null}
    </div>
  );
}
