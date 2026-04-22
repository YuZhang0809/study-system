export const WEEKLY_QUESTION_ORDER = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
export type WeeklyQuestionKey = (typeof WEEKLY_QUESTION_ORDER)[number];

export const WEEKLY_QUESTION_COPY: Record<WeeklyQuestionKey, string> = {
  q1: "本周最重要的学到是什么?",
  q2: "本周最浪费时间的是什么?",
  q3: "本周偏离了计划多少?",
  q4: "上周留的钩子兑现了吗?",
  q5: "本周新开了哪些账?",
  q6: "下周第一件事?",
};

export const WEEKLY_SCORE_KEYS = ["clarity", "honesty", "output", "depth", "discipline", "energy"] as const;
export type WeeklyScoreKey = (typeof WEEKLY_SCORE_KEYS)[number];

export const WEEKLY_SCORE_LABEL: Record<WeeklyScoreKey, string> = {
  clarity: "清晰度",
  honesty: "诚实",
  output: "产出",
  depth: "深度",
  discipline: "自律",
  energy: "精力",
};

export const WEEKLY_REFLECTION_REQUIRED_ERROR = "这一题不填,就写『没有』或『跳过本周』,但别空着";
export const WEEKLY_REFLECTION_MAX_LENGTH_ERROR = "这一题最多 2000 字";
export const WEEKLY_SCORE_REQUIRED_ERROR = "这一项必填";
export const WEEKLY_SCORE_RANGE_ERROR = "分值必须在 1 到 5 之间";
