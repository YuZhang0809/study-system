"use client";

import { useState, useTransition } from "react";
import { closeOpenItem } from "@/lib/daily-log/actions";

interface CloseOpenItemButtonProps {
  id: string;
}

export function CloseOpenItemButton({ id }: CloseOpenItemButtonProps) {
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
      const result = await closeOpenItem({ id });

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
        {isPending ? "处理中…" : "关闭"}
      </button>
      {error ? <p className="daily-log-error">{error}</p> : null}
    </div>
  );
}
