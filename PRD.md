# 学习管理 App — PRD

> **版本**：v1.0（产品定义稿）
> **写作日期**：2026-04-21
> **状态**：定义完成；Claude Design 页面 & 交互设计已落地（见
> `docs/design/study-system/` 与 `docs/decisions/0001-design-handoff-reference.md`）
> **下一步**：Next.js 脚手架 + Prisma schema 首个 slice（见
> `docs/STATE.md` Recommended Next Step）

---

## 0. 一句话定位

一个**单用户本地**的学习管理 app，把学习这件事的**过程、产出、偏离、反思**沉淀下来，让用户不能对自己的学习状态自欺。

学习内容本身**不在这里发生**（发生在 Claude Code / claude.ai / 书 / 课 / 动手写代码里），app 只承接学完之后的"账"。

**产品哲学**：一个让你不能自欺的工具。

---

## 1. 非目标（Anti-Patterns）

这四件事是明确的反线，写代码和设计交互时都要用来反复自检：

1. **不是家教**——不回答 "X 是什么"
2. **不是代笔**——learning / log / retro 的正文必须用户自己写，AI 只能做形式层辅助（slug / tag / 关联提示）
3. **不是啦啦队**——不做情绪化鼓励、不吹数据
4. **不是规划师**——不替用户生成学习计划

所有功能、所有 AI 交互都必须能通过这四条检查。

---

## 2. 用户 & 使用场景

### 用户
- **身份**：单用户，就是产品作者本人
- **部署**：本地（v1 先不做云同步、不做多用户）
- **设备**：桌面浏览器，高密度 UI，键盘优先

### 核心场景
1. **每天早上开工**：打开 Today 页，看今天要做什么、昨天停在哪、有没有欠账
2. **每天收工**：写 daily_log、标完成/偏离、给明天留一条钩子
3. **随时沉淀**：学到一个概念 / 踩了一个坑 / 攒了一个提示词 → 进 knowledge_item
4. **每周日**：走 weekly review checklist，写 weekly_log
5. **Phase 交付日**：走 phase exit checklist，写 retro
6. **任意时刻**：能看"我现在在哪、累计做了什么、偏离了多少"

### 不服务的场景
- 多人协作
- 移动端填写
- 离线 → 云同步
- 替用户学习内容

---

## 3. 核心抽象（数据骨架）

围绕**学习项目（project）** 组织。一个用户可以同时有多个 project。

### 主要实体

| 实体 | 作用 | 关键字段 |
|------|------|---------|
| `project` | 一个学习项目（如"90 天 Agentic 路线"、"探索 WebGPU"） | id, name, start_date, end_date?, has_plan_structure, status |
| `plan_segment` | 阶段 / Phase（可选） | id, project_id, order, name, start_date, end_date, goals |
| `plan_day` | 单日计划（可选） | id, segment_id?, date, title, planned_tasks(JSON) |
| `daily_log` | 每日流水（结构化） | id, project_id, date, what_done, what_skipped, time_spent, tomorrow_first_thing, honesty_note |
| `weekly_log` | 周复盘 | id, project_id, week_start, reflections(JSON, 6 题), self_scores(JSON) |
| `retro` | 阶段复盘 | id, segment_id, metrics(JSON), self_scores(JSON), three_questions(JSON), scope_changes(JSON) |
| `knowledge_item` | 知识沉淀（单表多态） | id, project_id, type, title, slug, body_md, tags(JSON), metadata(JSON), created_at |
| `artifact` | 外部产出指针 | id, owner_type, owner_id, kind, url_or_path, title, note |
| `open_item` | 未完成清单 | id, project_id, text, opened_at, source, status |
| `blocker` | 当前阻塞 | id, project_id, text, opened_at, resolved_at? |
| `bookmark` | 驾驶舱置顶 | id, project_id, label, target_type, target_id |

### 关键设计决策

**D-1｜`project.has_plan_structure` 三档光谱**
- 完整计划（有 segments + days）
- 只有阶段（有 segments，无 days）
- 完全开放（两者皆无，只堆 daily_log）

**D-2｜`knowledge_item` 单表多态**
- `type` ∈ { `learning`, `concept`, `bug`, `prompt` }
- 公共字段走列，差异字段走 `metadata` JSON
- 好处：查询统一、筛选/搜索一套、未来加新 type 成本低

**D-3｜`daily_log` 严格结构化，不留自由文本兜底**
- 所有字段都是预定义的结构化栏位
- v2 可以加 AI 辅助填写（仍然是 draft，用户 commit）
- 不留"今天想说什么"这种自由文本栏——避免变成情绪日记

**D-4｜`artifact` 只存指针，不存内容**
- 截图、链接、commit URL、对话记录都走外部存储
- app 只记 url / 本地路径 + 一句话 note
- 保持 app 轻盈，避免变成网盘

**D-5｜checklist 不进库**
- weekly / phase-exit checklist 的"勾选"只用于引导流程，不持久化
- 真正要留痕的内容走 weekly_log / retro 的结构化字段

---

## 4. 计划导入：形态 B

**规划动作发生在 app 外面。**

### 标准流程
1. 用户在 claude.ai 或 Claude Code 里和 AI 讨论新学习项目
2. AI 输出一份结构化 yaml（schema 由本 app 定义）
3. 用户人审一遍、改一改
4. 跑**幂等 seed CLI** 导入到 app → 生成 project + segments + days

### yaml schema（示意）
```yaml
project:
  name: "90 天 Agentic AI Product Builder"
  start_date: 2026-05-03
  end_date: 2026-07-31
  has_plan_structure: true

segments:
  - order: 1
    name: "Phase 1 - Web App 基础"
    start_date: 2026-05-03
    end_date: 2026-06-01
    goals:
      - "跑通 Task App v1"
      - "掌握 Next.js + Prisma 基础"

days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1 - 环境 & Hello World"
    planned_tasks:
      - "装 Node / VS Code / Git"
      - "create-next-app"
```

### 幂等性要求
- 同一个 yaml 重跑多次 = 结果一致
- 通过 (project.name + date) 或显式 id 做 upsert
- 已存在且有用户数据的不覆盖（只追加 / 更新元信息）

### v2 可选增强
- **计划体检**：导入时 AI 扫一遍 → "这个计划每周没留 debug 日 / 没留 retro 日，要不要加？"（教练角色，不是规划师）
- **计划模板库**：提供 "90 天路线式 / 30 天冲刺式 / 开放探索式" skeleton，用户填肉

**v1 不做计划生成器。**

---

## 5. AI 角色分层

### v1｜只做反射镜（Mirror）

- **无 LLM**，纯数据聚合
- **目的**：把用户已经产生的数据反射回来，让自欺变得困难

典型表达：
- "累计 commit 47 次 / 连续写 log 12 天 / 距 Phase 1 Checkpoint 还剩 8 天"
- "你上周说明天第一件事是 X，你今天做了吗？"
- "这个 tag 下你有 14 条 learning，最近一次是 5 天前"
- "你有 3 个 open_item 超过 7 天未处置"

**形式层 AI 辅助（允许）**：
- 写 learning 时 suggest slug / tag
- 提醒"你之前写过类似的 XXX 要不要关联"
- 模板补全（比如 retro 时自动拉上阶段的 metrics 填进去）

**内容层 AI（禁止）**：
- 替用户写 learning / log / retro 的正文
- 替用户解释概念
- 替用户评分

### v2｜增加三个 LLM 角色

| 角色 | 作用 | 典型表达 | 优先级 |
|------|------|---------|-------|
| **教练（Coach）** | 追问尖锐问题 | "这周 retro 你写了 3 条满意 0 条不满意，可信吗？" | P1 |
| **史官（Historian）** | 跨时间一致性检查 | "第 30 天你说要砍 X，第 60 天又加回来，为什么？" | P2 |
| **斥候（Scout）** | 预告下阶段风险 | "Phase 2 头两周按计划会做 X，v1 里 Y 没做完会影响" | P3 |
| **原则镜像** | 把用户定的元原则反射回来 | "你三个月前写过'AI 只辅助不决策'，这次是不是让 AI 做了决策？" | P1 |

### 统一规则（v1/v2 通用）

- AI 所有动作走 **draft → 用户 commit** 模式
- AI 不直接写 `daily_log` / `retro` / `knowledge_item` 正文
- AI 产物要有独立存储（prompt log / tool trace），可追溯
- 任意 AI 功能都能被关掉（`ai_enabled` per feature）

---

## 6. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Next.js (App Router) | 同进程 monolithic，FE/BE 清晰分层 |
| DB | SQLite | 单用户本地，零配置 |
| ORM | Prisma | schema 即文档，迁移可控 |
| 校验 | Zod | API 入参出参统一校验 |
| UI | Tailwind + shadcn/ui | 快速搭、可定制 |
| 部署 | 本地 node 跑起来即可 | v1 不上云 |

**架构原则**：同进程 monolithic，但 API 层和 UI 层保持清晰边界，为未来拆分（或上云、或开放给 AI agent 调用）留口。

---

## 7. MVP 范围（L3）

能完整跑一次"学习项目生命周期"：

1. 用 seed CLI 导入一个计划 → 生成 project + segments + days
2. 每天打开 Today 页看驾驶舱、写 daily_log、标完成 / 偏离
3. 随时沉淀 knowledge_item（learning / concept / bug / prompt）+ 挂 artifact
4. 每周写 weekly_log（结构化 6 题 + 自评分）
5. Phase 末尾写 retro（metrics + 6 能力自评 + 三问 + scope 调整）
6. 任意时刻能看"我在哪、累计做了什么、偏离多少"

### v1 不包含
- 多用户 / 云同步 / 移动端
- AI 角色（教练 / 史官 / 斥候 / 原则镜像）
- 计划生成器 / 计划体检
- 复杂权限 / 分享 / 协作

---

## 8. 首个客户 & 验收标准

**首个客户**：用户本人的 **90 天 Agentic AI Product Builder 路线**（2026-05-03 ～ 2026-07-31）。

### 上线时间要求
**2026-05-03 之前**可用（准备期 4/21–5/2，共 12 天开发窗口）。

### 验收清单
- 能导入 90 天路线的 plan yaml（90 天 × 3 个 phase）
- Day 1 当天能开始写 daily_log
- 能记 learning / bug / prompt / concept 四种 knowledge_item
- 能挂外部 artifact（GitHub commit URL、截图路径）
- Day 7 结束能写 weekly_log
- Day 30 能走完 Phase 1 retro 流程
- 驾驶舱能正确显示"我在 Day X / Phase Y / 累计 commit Z 次"

### 持续验证
用 90 天路线跑完整个 MVP，过程中产生的痛点进 v1.1 / v2 backlog。

---

## 9. 页面 & UX（已由 Claude Design 落地）

Claude Design 已交付完整 handoff，落盘在
`docs/design/study-system/`，并由
[`docs/decisions/0001-design-handoff-reference.md`](./docs/decisions/0001-design-handoff-reference.md)
做短版权威摘要。实现层读 decision 0001 + 设计 bundle，而不是重新
推导本节早期草案。

### 已锁定（由设计 handoff）

- **主导航**：`today` / `plan` / `knowledge` / `retros` /
  `artifacts` / `settings` 六个 tab，键盘 `1`–`5` 与 `,`
- **视觉基调**：纸 / 账本美学；Apple 系统字体栈（SF Pro + SF Mono），
  无 Google Fonts；OKLCH 色板；单一暖琥珀高亮；无 emoji、无
  itallics、无红绿交通灯；纸张条纹 overlay 是身份的一部分
- **Today 页**：驾驶舱一句话 + 全项目时间带 + 四事实条 +
  五个 block（昨日之承诺 · 未结清 / 今日 / 最近动静 / 未清账 /
  阻塞），三套布局变体通过 Tweaks 切换
- **End-of-day**：wizard 与 single-screen 两种形态（Tweaks 可切）
- **Knowledge 录入**：inline / modal / drawer 三种形态（Tweaks 可切）
- **项目元数据 UI 形状**：`has_plan_structure` / `status` /
  `today_index` / `total_days` / `segments[]` / `today_snapshot` /
  `stats`（具体定义见 decision 0001）

### 设计尚未覆盖（留给实现或新 decision）

- **新建项目 + 导入 plan yaml 的 UI**：上传 → 预览 → 确认 → seed
  的交互未在设计包中出现，后续需要决定是走 CLI、走 Settings 页
  上传、还是两者并行。
- **键盘完整覆盖**：除顶层 `1`–`5` / `,` / `N` / `⌘↵` 外，
  Plan / Knowledge / Retros 内部的精细键位尚未全部列出，可在对应
  slice 内逐步补齐。
- **artifact 挂接的细节**：decision 0001 锁定"只存指针"，但 UI
  中如何从 knowledge_item / daily_log 上下文调出 artifact picker
  尚未定型。
- **Tweaks 三轴是否长期存在**：`todayLayout` /
  `knowledgeInput` / `endOfDayMode` 目前是变体，是否最终收敛成
  单一选项属后续 decision。

---

## 10. 附：风险与红线

### 技术风险
- **数据丢失**：本地 SQLite 需要定时备份机制（v1 至少有导出 JSON 的 CLI）
- **schema 漂移**：Prisma migration 必须严格执行，每次改 schema 都写 migration

### 产品风险
- **变成待办工具**：如果 Today 页做成 todo list，就走回"功能 app"老路，失去"让你不自欺"的本质。要在设计时反复用反线检查。
- **AI 越界**：v2 加 AI 时容易滑向"代写"，必须死守 draft → commit 边界
- **功能膨胀**：v1 是 skeleton，肌肉是 v2。不要在 v1 塞"可能有用"的东西。

### 价值红线
- 如果某功能的设计**不能通过四条反线**（不是家教/代笔/啦啦队/规划师），**砍掉或重做**，不妥协。

---

**本文档状态**：产品定义完成；页面 & UX 设计已交付。
**当前交付物**：Claude Design handoff（`docs/design/study-system/`
+ 摘要 decision 0001）。
**下一步**：Next.js 脚手架 + Prisma schema 首个 slice（见
`docs/STATE.md` Recommended Next Step）。
