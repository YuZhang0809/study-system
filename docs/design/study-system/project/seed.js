// Seed data for two coexisting learning projects.
// Tone: cold statements of fact. Ledger language. No emoji.

window.SEED = (() => {
  // ----- Project A — the 90-day Agentic route (the "real" one) -----
  const A = {
    id: "p_agentic",
    name: "90 天 智能体产品搭建",
    start_date: "2026-05-03",
    end_date: "2026-07-31",
    has_plan_structure: "full",            // segments + days
    status: "pre_start",                    // today is 2026-04-21, not started
    today_index: null,                      // computed
    total_days: 90,
    segments: [
      {
        id: "s_a1",
        order: 1,
        name: "第一阶段 — Web App 基础",
        start_date: "2026-05-03",
        end_date: "2026-06-01",
        goals: [
          "跑通 Task App v1",
          "掌握 Next.js + Prisma 基础",
          "建立每日提交的节律"
        ]
      },
      {
        id: "s_a2",
        order: 2,
        name: "第二阶段 — 智能体原语",
        start_date: "2026-06-02",
        end_date: "2026-07-01",
        goals: [
          "理解 tool use / planning loop",
          "写一个可复现的 agent harness",
          "交付第二个原型"
        ]
      },
      {
        id: "s_a3",
        order: 3,
        name: "第三阶段 — 产品化",
        start_date: "2026-07-02",
        end_date: "2026-07-31",
        goals: [
          "把原型收敛为一个 demo-ready 产品",
          "写一份工程 retro",
          "对外 soft launch"
        ]
      }
    ],
    stats: { commits: 0, logs: 0, learnings: 0, bugs: 0, prompts: 0, concepts: 0 },
    open_items: [],
    blockers: [],
    daily_logs: [],
    knowledge: [],
    retros: [],
    weekly_logs: []
  };

  // ----- Project B — a shorter exploration, mid-flight -----
  const B = {
    id: "p_webgpu",
    name: "WebGPU 30 天探索",
    start_date: "2026-03-30",
    end_date: "2026-04-28",
    has_plan_structure: "segments_only",
    status: "active",
    today_index: 23,                        // day 23 / 30
    total_days: 30,
    segments: [
      {
        id: "s_b1", order: 1, name: "第一阶段 — 渲染管线",
        start_date: "2026-03-30", end_date: "2026-04-13",
        goals: ["理解 pipeline descriptor", "画出第一个三角形", "理解 bind group"]
      },
      {
        id: "s_b2", order: 2, name: "第二阶段 — 计算管线",
        start_date: "2026-04-14", end_date: "2026-04-28",
        goals: ["跑通 compute shader", "做一个粒子原型", "写一份 retro"]
      }
    ],
    stats: { commits: 41, logs: 19, learnings: 22, bugs: 7, prompts: 9, concepts: 11 },
    blockers: [
      { id: "bk1", text: "Safari 上 bind group layout 和 Chrome 行为不一致,还没排清楚",
        opened_at: "2026-04-17" }
    ],
    open_items: [
      { id: "o1", text: "把 Day 9 的 bug_058 写完整 — 只记了现象没记原因",
        opened_at: "2026-04-09", source: "daily_log#d9", status: "open", days_overdue: 12 },
      { id: "o2", text: "和 claude.ai 讨论 storage buffer 对齐规则 — 存成 prompt",
        opened_at: "2026-04-15", source: "daily_log#d15", status: "open", days_overdue: 6 },
      { id: "o3", text: "重跑 粒子 demo benchmark,上次结果不可信",
        opened_at: "2026-04-18", source: "retro_draft", status: "open", days_overdue: 3 },
      { id: "o4", text: "把 bind group 和 pipeline layout 的关系写成一张图",
        opened_at: "2026-04-19", source: "weekly_log#w3", status: "open", days_overdue: 2 }
    ],
    daily_logs: [
      // most recent first
      {
        id: "dl_20",
        date: "2026-04-20",
        what_done: [
          "读完 WebGPU samples 的 compute.boids 示例,逐行注释",
          "把 workgroup size 的选择逻辑写进 concept_014"
        ],
        what_skipped: [
          { text: "粒子 demo 的 benchmark 重跑", reason: "时间不够,推到明天" }
        ],
        time_spent: 175,  // minutes
        tomorrow_first_thing: "打开 particles/bench.ts,先跑一次 baseline 再动代码",
        honesty_note: "今天看得多写得少。明天必须动代码。",
        committed_at: "22:41"
      },
      {
        id: "dl_19",
        date: "2026-04-19",
        what_done: [
          "修好 Safari 上 storage buffer 不显示的问题(是 alignment 不对)",
          "写了 bug_007,带复现步骤"
        ],
        what_skipped: [],
        time_spent: 210,
        tomorrow_first_thing: "读 compute.boids 然后收敛到自己的粒子 demo",
        honesty_note: "",
        committed_at: "23:10"
      },
      {
        id: "dl_18",
        date: "2026-04-18",
        what_done: [
          "画了 bind group 和 pipeline 关系草图(纸上)",
          "把草图扫成 artifact 挂到 learning_021"
        ],
        what_skipped: [
          { text: "重跑 benchmark", reason: "还没写脚本" }
        ],
        time_spent: 140,
        tomorrow_first_thing: "把 Safari 那个 bind group 问题搞清楚",
        honesty_note: "承认: 我在逃避 benchmark,因为不想看到数字不好看。",
        committed_at: "22:20"
      }
    ],
    knowledge: [
      { id: "k_024", type: "learning", title: "WebGPU 的 queue.submit 其实是异步的", slug: "queue-submit-async",
        tags: ["webgpu","mental-model"], created_at: "2026-04-20", updated_at: "2026-04-20",
        excerpt: "queue.submit 返回前 GPU 并没做完,需要显式等待 onSubmittedWorkDone 才能安全读回。",
        artifacts: 1, linked: 2 },
      { id: "k_023", type: "prompt", title: "让 Claude 解释 WGSL 的 storage vs uniform", slug: "wgsl-storage-vs-uniform",
        tags: ["wgsl","prompt-lib"], created_at: "2026-04-20", updated_at: "2026-04-20",
        excerpt: "给出最小示例,追问对齐规则,然后要求列出常见错误。",
        artifacts: 0, linked: 1 },
      { id: "k_022", type: "bug", title: "Safari 上 storage buffer 全是 0",  slug: "safari-sb-zero",
        tags: ["webgpu","safari","alignment"], created_at: "2026-04-19", updated_at: "2026-04-19",
        excerpt: "根因: struct 字段顺序改变后没调整 @align,Safari 比 Chrome 严格。",
        artifacts: 2, linked: 3 },
      { id: "k_021", type: "learning", title: "bind group 层级 = 描述符 + 资源两层", slug: "bind-group-two-layer",
        tags: ["webgpu","mental-model"], created_at: "2026-04-18", updated_at: "2026-04-19",
        excerpt: "BindGroupLayout 只描述形状,BindGroup 才绑定具体 buffer/texture。",
        artifacts: 1, linked: 4 },
      { id: "k_020", type: "concept",  title: "workgroup size 与 SIMD 宽度", slug: "workgroup-simd",
        tags: ["compute","gpu-arch"], created_at: "2026-04-17", updated_at: "2026-04-17",
        excerpt: "硬件倾向 32/64;跨平台稳妥选 64。太小浪费,太大溢出寄存器。",
        artifacts: 0, linked: 2 },
      { id: "k_019", type: "learning", title: "pipeline 不可重用,layout 可以", slug: "pipeline-not-reusable",
        tags: ["webgpu","api"], created_at: "2026-04-15", updated_at: "2026-04-15",
        excerpt: "每换一次 vertex format 都得新建 pipeline,layout 独立缓存。",
        artifacts: 0, linked: 1 },
      { id: "k_018", type: "bug",      title: "Chrome 119 下某些 f16 crash", slug: "chrome-f16-crash",
        tags: ["webgpu","chrome","f16"], created_at: "2026-04-14", updated_at: "2026-04-14",
        excerpt: "开 f16 扩展时某些 device 直接丢 device。退到 f32 规避。",
        artifacts: 1, linked: 0 },
      { id: "k_017", type: "prompt",   title: "让 Claude 当 WebGPU debugger", slug: "claude-webgpu-debugger",
        tags: ["prompt-lib","debug"], created_at: "2026-04-12", updated_at: "2026-04-12",
        excerpt: "先贴最小 repro,再要求它列出 5 个最可能假设并排序。",
        artifacts: 0, linked: 0 },
      { id: "k_016", type: "learning", title: "vertex state 是 pipeline 的一部分", slug: "vertex-state-in-pipeline",
        tags: ["webgpu","api"], created_at: "2026-04-11", updated_at: "2026-04-11",
        excerpt: "换 vertex layout 必须新 pipeline。合并 pipeline 减少切换。",
        artifacts: 0, linked: 1 }
    ],
    weekly_logs: [
      {
        id: "wl_3", week_start: "2026-04-13", week_end: "2026-04-19", week_n: 3,
        scores: { clarity: 3, honesty: 4, output: 3, depth: 4, discipline: 3, energy: 3 },
        reflections: [
          { q: "本周最重要的学到是什么?", a: "bind group 的两层模型,这改变了我读 WebGPU 代码的方式。" },
          { q: "本周最浪费时间的是什么?", a: "追 Safari 那个 bug 第一天方向错了,浪费了 3 小时。" },
          { q: "本周偏离了计划多少?", a: "3 个 planned day 有跑 bench 但都推迟了,原因一致: 我怕数字。" },
          { q: "上周留的钩子兑现了吗?", a: "2/3 兑现,benchmark 那个没做。" },
          { q: "本周新开了哪些账?", a: "4 个 open_item,其中 2 个已经超过 5 天。" },
          { q: "下周第一件事?", a: "Monday 09:00: 跑 particles/bench.ts 的 baseline,不允许先改代码。" }
        ],
        committed_at: "2026-04-19 22:58"
      },
      {
        id: "wl_2", week_start: "2026-04-06", week_end: "2026-04-12", week_n: 2,
        scores: { clarity: 3, honesty: 3, output: 4, depth: 3, discipline: 4, energy: 4 },
        reflections: [
          { q: "本周最重要的学到是什么?", a: "WebGPU 的生命周期模型(device 会丢)。" },
          { q: "本周最浪费时间的是什么?", a: "重读了一遍自己上周写的 learning,说明我没消化。" },
          { q: "本周偏离了计划多少?", a: "基本按计划。" },
          { q: "上周留的钩子兑现了吗?", a: "全部兑现。" },
          { q: "本周新开了哪些账?", a: "1 个 prompt 没归档。" },
          { q: "下周第一件事?", a: "把 bind group 搞清楚,目前是盲区。" }
        ],
        committed_at: "2026-04-12 22:30"
      }
    ],
    retros: [
      {
        id: "r_b1", segment_id: "s_b1", segment_name: "第一阶段 — 渲染管线",
        committed_at: "2026-04-13 23:12",
        metrics: { commits: 28, logs: 14, learnings: 16, bugs: 4, prompts: 5, planned_days: 15, drift_days: 3 },
        scores: { clarity: 4, honesty: 4, output: 3, depth: 3, discipline: 4, energy: 4 },
        three_questions: [
          { q: "这个阶段真正搞懂的东西是什么?", a: "WebGPU 的资源绑定模型,以及为什么 descriptor 和 binding 要分开。" },
          { q: "这个阶段没搞懂但当时骗自己搞懂了的东西是什么?", a: "async 边界。我以为 await queue 就等于 GPU 做完了。" },
          { q: "如果重来,哪一步可以砍掉?", a: "前 3 天的「环境折腾」,应该直接用别人的 boilerplate。" }
        ],
        scope_changes: [
          { change: "砍掉 'WGSL 完整规范通读'", reason: "ROI 太低,查得到就行" },
          { change: "加 'Safari 兼容专项'", reason: "bug_007 让我知道这不是小事" }
        ]
      }
    ]
  };

  // Attach current-day planned tasks for today driver
  B.today_snapshot = {
    date: "2026-04-21",
    day_index: 23,
    phase: B.segments[1],
    phase_day: 8,       // day 8 of phase 2 (15 days)
    phase_total: 15,
    planned: [
      { id: "t1", text: "跑 particles/bench.ts baseline", source: "plan" },
      { id: "t2", text: "把 bind group 关系图画完(承诺于 2026-04-19 的 weekly)", source: "promise" },
      { id: "t3", text: "解决 Safari bind group layout 不一致", source: "blocker" }
    ],
    promises: [
      { text: "跑 particles/bench.ts 的 baseline,不允许先改代码", from: "weekly_log w3", at: "2026-04-19" },
      { text: "打开 particles/bench.ts,先跑一次 baseline 再动代码", from: "daily_log d20", at: "2026-04-20" }
    ],
    // recent activity for the "tape" column
    tape: [
      { t: "2026-04-20 22:41", kind: "log",      text: "提交 daily_log d20" },
      { t: "2026-04-20 20:05", kind: "learning", text: "新增 learning_024 — queue.submit 其实是异步" },
      { t: "2026-04-20 17:30", kind: "artifact", text: "挂 GitHub commit a4f2b1 到 learning_024" },
      { t: "2026-04-20 11:12", kind: "prompt",   text: "新增 prompt_023 — WGSL storage vs uniform" },
      { t: "2026-04-19 23:10", kind: "log",      text: "提交 daily_log d19" },
      { t: "2026-04-19 22:58", kind: "weekly",   text: "提交 weekly_log w3" },
      { t: "2026-04-19 18:44", kind: "bug",      text: "新增 bug_022 — Safari storage buffer 全 0" },
      { t: "2026-04-19 14:02", kind: "artifact", text: "挂截图到 bug_022" }
    ]
  };

  return { projects: [B, A], activeProjectId: "p_webgpu" };
})();
