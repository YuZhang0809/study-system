import {
  WEEKLY_SCORE_KEYS,
  WEEKLY_SCORE_LABEL,
  type WeeklyScoreKey,
} from "../weekly-log/copy";

export const RETRO_THREE_QUESTION_ORDER = ["q1", "q2", "q3"] as const;
export type RetroThreeQuestionKey = (typeof RETRO_THREE_QUESTION_ORDER)[number];

export const RETRO_THREE_QUESTION_COPY: Record<RetroThreeQuestionKey, string> = {
  q1: "这个阶段真正搞懂的东西是什么?",
  q2: "这个阶段没搞懂但当时骗自己搞懂了的东西是什么?",
  q3: "如果重来,哪一步可以砍掉?",
};

export const RETRO_SCORE_KEYS = WEEKLY_SCORE_KEYS;
export type RetroScoreKey = WeeklyScoreKey;
export const RETRO_SCORE_LABEL = WEEKLY_SCORE_LABEL;

export const RETRO_METRIC_KEYS = [
  "commits",
  "logs",
  "learnings",
  "bugs",
  "prompts",
  "planned_days",
  "drift_days",
] as const;
export type RetroMetricKey = (typeof RETRO_METRIC_KEYS)[number];

export const RETRO_METRIC_LABEL: Record<RetroMetricKey, string> = {
  commits: "提交数",
  logs: "日记数",
  learnings: "心得数",
  bugs: "缺陷数",
  prompts: "提示数",
  planned_days: "计划天",
  drift_days: "偏离天",
};

export const RETRO_WIZARD_STEPS = [
  {
    t: "指标 · 先看数字，不允许绕过",
    s: "这些数字是 app 替你拉出来的。先看 5 秒再写别的。",
  },
  {
    t: "六项自评 · 1–5",
    s: "清晰度 / 诚实 / 产出 / 深度 / 自律 / 精力。上一阶段的分数会留着对比。",
  },
  {
    t: "三问 · 自己写",
    s: "AI 不会替你答这三题。不接受一句话敷衍。",
  },
  {
    t: "范围调整 · 承认偏离",
    s: "砍了什么 · 加了什么 · 为什么。非辩解，只记录。",
  },
  {
    t: "留钩子 · 下一阶段第一件事",
    s: "下一阶段第 1 天第一件事是什么。具体。",
  },
] as const;

export const REFLECTION_REQUIRED_ERROR = "这一题不填,就写『没有』或『跳过』,但别空着";
export const REFLECTION_MAX_LENGTH_ERROR = "这一题最多 2000 字";
export const SCORE_REQUIRED_ERROR = "这一项必填";
export const SCORE_RANGE_ERROR = "分值必须在 1 到 5 之间";
export const HOOK_REQUIRED_ERROR = "这条必填,不然下一阶段就没有钩子";
export const HOOK_MAX_LENGTH_ERROR = "这条最多 500 字";
export const SCOPE_FIELD_REQUIRED_ERROR = "这一条没填完,要么删了要么补齐";
export const SCOPE_FIELD_MAX_LENGTH_ERROR = "每条最多 500 字";
