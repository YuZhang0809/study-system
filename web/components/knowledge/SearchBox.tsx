"use client";

import { useDeferredValue, useEffect, useEffectEvent, useState } from "react";
import { Icon } from "@/components/shell/Icon";

interface SearchBoxProps {
  tableBodyId: string;
  emptyRowId: string;
}

export function SearchBox({ tableBodyId, emptyRowId }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const applyFilter = useEffectEvent((value: string) => {
    const tableBody = document.getElementById(tableBodyId);
    const emptyRow = document.getElementById(emptyRowId);

    if (!tableBody || !emptyRow) {
      return;
    }

    const normalized = value.trim().toLowerCase();
    const rows = Array.from(tableBody.querySelectorAll<HTMLTableRowElement>("[data-knowledge-row='true']"));
    let visibleCount = 0;

    for (const row of rows) {
      const haystack = row.dataset.searchText ?? "";
      const matches = !normalized || haystack.includes(normalized);
      row.hidden = !matches;

      if (matches) {
        visibleCount += 1;
      }
    }

    emptyRow.hidden = visibleCount !== 0;
  });

  useEffect(() => {
    applyFilter(deferredQuery);
  }, [deferredQuery]);

  return (
    <div className="knowledge-search">
      <Icon name="search" size={12} className="knowledge-search-icon" />
      <input
        className="input knowledge-search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜标题 / 标签…"
        aria-label="搜索知识条目"
      />
      <span className="kbd">/</span>
    </div>
  );
}
