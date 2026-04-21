"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/shell/Icon";
import { createKnowledgeItem, type CreateKnowledgeItemResult } from "@/lib/knowledge/actions";
import type { KnowledgeItemType } from "@/lib/schemas/enums";

interface InlineComposeProps {
  projectId: string;
  type: KnowledgeItemType;
  onTypeChange: (type: KnowledgeItemType) => void;
  onClose: () => void;
}

const TYPE_ORDER: KnowledgeItemType[] = ["learning", "concept", "bug", "prompt"];

const TYPE_PLACEHOLDERS: Record<KnowledgeItemType, string> = {
  learning: "我原本以为… 实际上是… 所以…",
  concept: "定义 · 最小例子 · 常见误解",
  bug: "现象 · 复现步骤 · 根因 · 规避",
  prompt: "提示词正文 · 适用场景 · 注意事项",
};

const TAG_PATTERN = /^[^\s,]+$/u;

export function InlineCompose({ projectId, type, onTypeChange, onClose }: InlineComposeProps) {
  const [title, setTitle] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [urlOrPath, setUrlOrPath] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CreateKnowledgeItemResult["fieldErrors"]>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void submit(formData);
    });
  }

  async function submit(formData: FormData) {
    try {
      const result = await createKnowledgeItem(formData);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      resetForm();
      onClose();
    } catch {
      setSubmitError("提交失败，请稍后再试。");
    }
  }

  function resetForm() {
    setTitle("");
    setBodyMd("");
    setUrlOrPath("");
    setTags([]);
    setTagInput("");
    setTagError(null);
    setFieldErrors({});
    setSubmitError(null);
  }

  function addTag() {
    const candidate = tagInput.trim();

    if (!candidate) {
      return;
    }

    if (!TAG_PATTERN.test(candidate)) {
      setTagError("标签不能包含空格或逗号。");
      return;
    }

    if (candidate.length > 32) {
      setTagError("标签最多 32 字。");
      return;
    }

    if (tags.includes(candidate)) {
      setTagInput("");
      setTagError(null);
      return;
    }

    if (tags.length >= 12) {
      setTagError("最多 12 个标签。");
      return;
    }

    setTags((current) => [...current, candidate]);
    setTagInput("");
    setTagError(null);
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((value) => value !== tag));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addTag();
  }

  function handleBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key === "NumpadEnter")) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="card knowledge-compose-card">
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="type" value={type} />
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}

        <div className="knowledge-compose-head">
          <div className="knowledge-type-tabs" role="tablist" aria-label="知识类型">
            {TYPE_ORDER.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={`knowledge-type-tab${type === candidate ? " is-active" : ""}`}
                onClick={() => onTypeChange(candidate)}
                role="tab"
                aria-selected={type === candidate}
              >
                <Icon name={candidate} size={10} />
                <span>{candidate}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            <Icon name="close" size={11} />
            <span>收起</span>
          </button>
        </div>

        <div className="knowledge-compose-grid">
          <div className="knowledge-compose-main">
            <label className="knowledge-field">
              <span className="mono t-xs ink-3 caps">标题</span>
              <input
                name="title"
                className="input"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="一句话: 这条心得在讲什么"
              />
              <FieldError errors={fieldErrors} name="title" />
            </label>

            <label className="knowledge-field">
              <span className="mono t-xs ink-3 caps">正文</span>
              <textarea
                name="bodyMd"
                className="textarea"
                rows={3}
                value={bodyMd}
                onChange={(event) => setBodyMd(event.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder={TYPE_PLACEHOLDERS[type]}
              />
              <FieldError errors={fieldErrors} name="bodyMd" />
            </label>

            <label className="knowledge-field">
              <span className="mono t-xs ink-3 caps">产出指针 · 外部产出（URL / 本地路径）</span>
              <input
                name="urlOrPath"
                className="input"
                value={urlOrPath}
                onChange={(event) => setUrlOrPath(event.target.value)}
                placeholder="https://github.com/…/commit/abc123 或 screenshots/2026-04-22/foo.png"
              />
              <FieldError errors={fieldErrors} name="urlOrPath" />
            </label>
          </div>

          <div className="knowledge-compose-side">
            <div className="knowledge-field">
              <span className="mono t-xs ink-3 caps">标签</span>
              <div className="knowledge-tag-row">
                {tags.map((tag) => (
                  <span key={tag} className="chip chip--amber">
                    <span>#{tag}</span>
                    <button type="button" className="knowledge-chip-remove" onClick={() => removeTag(tag)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="knowledge-tag-input-row">
                <input
                  className="mono t-xs knowledge-tag-input"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="+ 标签 ↵"
                />
                <button type="button" className="btn" onClick={addTag}>
                  添加
                </button>
              </div>
              {tagError ? <p className="knowledge-error">{tagError}</p> : null}
              <FieldError errors={fieldErrors} name="tags" />
            </div>

            <p className="knowledge-note">正文你自己写 · AI 不参与</p>
          </div>
        </div>

        {submitError ? (
          <p className="knowledge-error" aria-live="polite">
            {submitError}
          </p>
        ) : null}

        <div className="knowledge-compose-footer">
          <p className="knowledge-note">正文你自己写 · AI 不参与</p>
          <div className="knowledge-compose-actions">
            <button type="button" className="btn" disabled>
              存为草稿
            </button>
            <button type="submit" className="btn btn--primary" disabled={isPending}>
              <span>{isPending ? "提交中…" : "提交"}</span>
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldError({
  errors,
  name,
}: {
  errors: CreateKnowledgeItemResult["fieldErrors"];
  name: string;
}) {
  const message = errors?.[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="knowledge-error">{message}</p>;
}
