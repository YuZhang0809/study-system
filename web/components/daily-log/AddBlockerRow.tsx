"use client";

import { useState, useTransition } from "react";
import { createBlocker } from "@/lib/daily-log/actions";

interface AddBlockerRowProps {
  projectId: string;
}

export function AddBlockerRow({ projectId }: AddBlockerRowProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    try {
      const result = await createBlocker({ projectId, text });

      if (!result.ok) {
        setError(result.fieldErrors?.text?.[0] ?? result.fieldErrors?.projectId?.[0] ?? "添加失败。");
        return;
      }

      setText("");
    } catch {
      setError("添加失败。");
    }
  }

  return (
    <form className="daily-inline-row" onSubmit={handleSubmit}>
      <input
        className="input daily-inline-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="+ 新增阻塞 ↵"
        maxLength={500}
      />
      <button type="submit" className="btn" disabled={isPending}>
        {isPending ? "添加中…" : "添加"}
      </button>
      {error ? <p className="daily-log-error daily-inline-error">{error}</p> : null}
    </form>
  );
}
