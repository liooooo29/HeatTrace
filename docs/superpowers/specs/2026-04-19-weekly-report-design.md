# HeatTrace 功能增强设计文档

> 4 个新功能：周报 + 键盘手型热力图 + AI 洞察总结 + 打字节奏可视化

## 产品定位

HeatTrace 是个人生产力工具。本次新增的功能让数据从"记录"变成"洞察"——不只是告诉你打了多少键，而是让你理解自己的工作模式。

## 设计系统

沿用现有暗色金融仪表盘风格，所有新组件保持一致。

---

## 功能一：周报

### 入口

在 Dashboard 页面的标题区域（`Today` 旁边），加一个图标按钮，点击后 Dashboard 内容切换为周报视图。周报标题旁有返回按钮，回到日常 Dashboard。

```
Dashboard 标题区:
┌──────────────────────────────────────────────────────┐
│  Today                        [Weekly Report 图标]  │
│  Daily activity summary                              │
└──────────────────────────────────────────────────────┘
```

点击图标后，Dashboard 整体替换为周报：

```
┌──────────────────────────────────────────────────────┐
│  Weekly Report              ← 返回     Apr 13 - 19  │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ │
│  │ 12.3k │ │  842  │ │ 2.1km │ │ 6.5h  │ │  42   │ │
│  │ keys  │ │ clicks│ │ dist  │ │ active│ │ WPM   │ │
│  │  ↑8%  │ │  ↓3%  │ │ ↑12%  │ │  ↑5%  │ │  ↑2%  │ │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ │
│                                                      │
│  ▸ Activity Heatmap                                  │
│  ┌──────────────────────────────────────────────┐    │
│  │  [7天×24小时 热力网格]                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ▸ Insights                                          │
│  ┌──────────────────────────────────────────────┐    │
│  │  ✦ 你的效率巅峰在 14:00                       │    │
│  │  ✦ 最常用的快捷键是 Cmd+C                     │    │
│  │  ✦ 周三是你最忙碌的一天                       │    │
│  │  ✦ 本周共 24 次打字会话                       │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ▸ App Distribution                                  │
│  ┌──────────────────────────────────────────────┐    │
│  │  [迷你条形图 Top 5 应用]                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│              [ Export as Image ]                      │
└──────────────────────────────────────────────────────┘
```

### 核心指标卡片

5 个指标：按键量、点击次数、鼠标距离、活跃时间、WPM。每个卡片底部带与上周的百分比变化（↑8% 绿色 / ↓3% 红色）。

### 活跃度热力图

7天 × 24小时 网格：
- 横轴：周一到周日（文字标签）
- 纵轴：0:00 - 23:00（每小时一行）
- 每个格子颜色深浅表示该小时的按键量归一化值
- Hover 显示具体数值

### Insights 生成规则

| Insight | 条件 | 内容 |
|---------|------|------|
| Peak Hour | 总是 | "你的效率巅峰在 {hour}:00" |
| Top Combo | 有数据时 | "最常用的快捷键是 {combo}" |
| Most Active Day | 总是 | "{周几} 是你最忙碌的一天" |
| Typing Speed | WPM > 0 | "平均 {wpm} WPM，{比上周快/慢} {x}%" |
| Distance | 总是 | "鼠标移动了 {m}，相当于 {趣味类比}" |
| Streak | 连续天数 > 1 | "连续 {n} 天保持活跃" |
| Session Stats | 总是 | "共 {n} 次打字会话，平均 {x} 分钟" |

### 图片导出

使用 `html-to-image` 将周报 DOM 渲染为 PNG（2x 像素比），通过 Go 的 `SaveFileDialog` 保存到用户选择的位置。

### 数据接口

```go
// app.go 新增
func (a *App) GetWeeklyReport() (*WeeklyReport, error)
func (a *App) SaveReportImage(base64Data string) (string, error)
```

```go
// analytics/weekly_report.go 新建
type WeeklyReport struct {
    StartDate      string           `json:"start_date"`
    EndDate        string           `json:"end_date"`
    TotalKeys      int              `json:"total_keys"`
    TotalClicks    int              `json:"total_clicks"`
    TotalDistance  float64          `json:"total_distance_meters"`
    ActiveMinutes  int              `json:"active_minutes"`
    AvgWPM         float64          `json:"avg_wpm"`
    AppCount       int              `json:"app_count"`
    PrevWeek       *WeekComparison  `json:"prev_week"`
    DailyGrid      []DailyGridCell  `json:"daily_grid"`
    Insights       []Insight        `json:"insights"`
    TopApps        []AppUsagePoint  `json:"top_apps"`
}

type WeekComparison struct {
    KeysDelta     float64 `json:"keys_delta"`
    ClicksDelta   float64 `json:"clicks_delta"`
    DistanceDelta float64 `json:"distance_delta"`
    ActiveDelta   float64 `json:"active_delta"`
    WPMDelta      float64 `json:"wpm_delta"`
}

type DailyGridCell struct {
    Date  string  `json:"date"`
    Hour  int     `json:"hour"`
    Keys  int     `json:"keys"`
    Value float64 `json:"value"`
}

type Insight struct {
    Title  string `json:"title"`
    Detail string `json:"detail"`
    Color  string `json:"color"`
}
```

---

## 功能二：键盘手型热力图

### 概念

像钢琴老师分析指法一样，在虚拟键盘上渲染 **左右手** 的按键分布。让用户直观看到自己的打字习惯——是双手标准姿势，还是主要靠右手？

### UI 设计

在 ActivityPanel 的键盘热力图区域，新增一个切换：「按键频率」↔「手型分布」。

手型分布视图：
- 键盘从中间分为左右两半
- 左半边（左手控制区）用蓝色系渐变
- 右半边（右手控制区）用琥珀色系渐变
- 每个按键的颜色深度 = 该键的点击频率归一化值
- 键盘下方显示一个小的手型示意图，标注手指分配

```
左手: 小指→A 无名→S 中指→D 食指→F G
右手: 食指→H J 中指→K 无名→L 小指→;
```

### 颜色方案

- 左手：`#818CF8` (Indigo) 渐变到透明
- 右手：`#F59E0B` (Amber) 渐变到透明
- 手指标注用更浅的同色系

### 数据

不需要新增后端接口。复用现有的 `GetHeatmapData` 返回的 `KeyHeatPoint[]`，在前端根据按键位置判断属于哪只手哪根手指，然后渲染不同的颜色。

### 手指映射（前端本地）

```ts
const FINGER_MAP: Record<string, 'left-pinky' | 'left-ring' | 'left-middle' | 'left-index' | 'right-index' | 'right-middle' | 'right-ring' | 'right-pinky' | 'thumb'> = {
  '`': 'left-pinky', '1': 'left-pinky', 'q': 'left-pinky', 'a': 'left-pinky', 'z': 'left-pinky',
  '2': 'left-ring', 'w': 'left-ring', 's': 'left-ring', 'x': 'left-ring',
  '3': 'left-middle', 'e': 'left-middle', 'd': 'left-middle', 'c': 'left-middle',
  '4': 'left-index', 'r': 'left-index', 'f': 'left-index', 'v': 'left-index',
  '5': 'left-index', 't': 'left-index', 'g': 'left-index', 'b': 'left-index',
  '6': 'right-index', 'y': 'right-index', 'h': 'right-index', 'n': 'right-index',
  '7': 'right-index', 'u': 'right-index', 'j': 'right-index', 'm': 'right-index',
  '8': 'right-middle', 'i': 'right-middle', 'k': 'right-middle', ',': 'right-middle',
  '9': 'right-ring', 'o': 'right-ring', 'l': 'right-ring', '.': 'right-ring',
  '0': 'right-pinky', '-': 'right-pinky', '=': 'right-pinky',
  'p': 'right-pinky', '[': 'right-pinky', ']': 'right-pinky', '\\': 'right-pinky',
  ';': 'right-pinky', "'": 'right-pinky', '/': 'right-pinky',
  'space': 'thumb',
};
```

---

## 功能三：AI 洞察总结

### 概念

不需要联网、不需要 OpenAI。用规则引擎模拟"AI 总结"的效果——分析用户的行为模式，用自然语言生成一段话，就像一个私人助理在观察你的工作习惯。

### 实现方式

纯规则引擎 + 模板系统，在 Go 后端实现。不调用任何外部 API。

### UI 设计

在周报的 Insights 区域，**顶部**新增一段自然语言总结（区别于下面的 bullet-point insights），显示为一个突出的卡片：

```
┌──────────────────────────────────────────────────────┐
│  ✦ Weekly Summary                                    │
│  ─────────────────────────────────────────────────   │
│  You were most productive on Wednesday afternoon.    │
│  Your typing speed improved 8% from last week.       │
│  You spent most time in VS Code, with 34% of total   │
│  keystrokes. Consider taking more breaks — you had   │
│  two sessions over 2 hours without stopping.         │
└──────────────────────────────────────────────────────┘
```

### 总结生成规则

后端分析数据后，从以下模板中选择组合（中英文各一套）：

**开场句**（选 1 个最突出的）：
- 如果 WPM 上升 > 5%: "本周打字速度显著提升，比上周快了 {x}%"
- 如果按键量上升 > 20%: "本周工作量明显增加，按键量增长了 {x}%"
- 如果有连续活跃天数: "连续 {n} 天保持活跃，稳定输出"
- 否则: "本周共工作 {n} 天，总计 {h} 小时"

**效率句**（选 1 个）：
- "你的效率巅峰在 {hour}:00，这个时段的打字速度是其他时间的 {x} 倍"
- "{weekday} 是你最高效的一天"

**应用句**（如果有数据）：
- "你 {x}% 的时间花在 {app} 上"

**关怀句**（如果有警告）：
- "有 {n} 次超过 2 小时未休息，建议每 90 分钟休息一次"

将 2-4 句拼接成一段自然语言。

### 数据接口

复用 `WeeklyReport` 的 Insights 字段，新增 `Summary string` 字段存储自然语言总结。

---

## 功能四：打字节奏可视化

### 概念

像心电图/音频波形一样，将打字行为可视化为一条节奏曲线。流畅编码 = 均匀波形，思考/查文档 = 低谷，赶工 = 密集尖峰。

### UI 设计

在 TypingPanel（Productivity 页面）新增一个区域「Typing Rhythm」，放在现有图表之后。

```
▸ Typing Rhythm
┌──────────────────────────────────────────────────────┐
│  ╱╲  ╱╲        ╱╲╱╲╱╲╱╲    ╱╲      ╱╲╱╲            │
│ ╱  ╲╱  ╲──────╱          ╲──╱  ╲────╱    ╲───╱╲─    │
│                     ↑               ↑                │
│               深度编码         切换上下文              │
│  ──────────────────────────────────────────────────  │
│  09:00      10:00      11:00      12:00      13:00   │
└──────────────────────────────────────────────────────┘
```

### 数据计算

后端新增 API：

```go
func (a *App) GetTypingRhythm(startDate, endDate string) ([]RhythmPoint, error)
```

```go
type RhythmPoint struct {
    Time  string  `json:"time"`  // "09:00", "09:05" 等 5 分钟粒度
    CPM   float64 `json:"cpm"`   // 该 5 分钟窗口内的每分钟字符数
    Keys  int     `json:"keys"`  // 该窗口内的按键数
}
```

计算逻辑：
1. 将一天按 5 分钟切分为窗口
2. 对每个窗口计算 CPM（按键数 / 窗口分钟数）
3. 输出 `[]RhythmPoint`

### 前端渲染

使用 recharts 的 `AreaChart`，线条用 `var(--accent)` 颜色，填充半透明。X 轴为时间，Y 轴为 CPM。

在高 CPM 区域自动标注标签（如"密集输入"），在低 CPM 区域标注（如"休息中"）。

---

## 文件清单

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `analytics/weekly_report.go` | 新建 | 周报计算逻辑 + Insights 生成 + 自然语言总结 |
| 2 | `analytics/typing_rhythm.go` | 新建 | 打字节奏 5 分钟窗口计算 |
| 3 | `app.go` | 修改 | 新增 `GetWeeklyReport`, `SaveReportImage`, `GetTypingRhythm` |
| 4 | `frontend/src/types/index.ts` | 修改 | 新增所有新类型 |
| 5 | `frontend/src/wails-bindings.ts` | 修改 | 新增 3 个绑定函数 |
| 6 | `frontend/src/components/Dashboard.tsx` | 修改 | 添加周报入口按钮 + 周报/日常视图切换 |
| 7 | `frontend/src/components/WeeklyReport.tsx` | 新建 | 周报主组件（含导出） |
| 8 | `frontend/src/components/WeeklyHeatmap.tsx` | 新建 | 7天×24小时热力网格 |
| 9 | `frontend/src/components/KeyboardHeatmap.tsx` | 修改 | 新增手型分布模式切换 |
| 10 | `frontend/src/components/TypingRhythm.tsx` | 新建 | 打字节奏波形图 |
| 11 | `frontend/src/components/TypingPanel.tsx` | 修改 | 引入 TypingRhythm 组件 |
| 12 | `frontend/src/i18n.ts` | 修改 | 新增所有翻译 key |
| 13 | `frontend/src/style.css` | 修改 | 新增样式 |
| 14 | `frontend/package.json` | 修改 | 添加 `html-to-image` 依赖 |

## 实现顺序

1. **后端** — `analytics/weekly_report.go` + `analytics/typing_rhythm.go` + `app.go` 新方法
2. **类型和绑定** — `types/index.ts` + `wails-bindings.ts`
3. **键盘手型热力图** — `KeyboardHeatmap.tsx` 新增手型模式
4. **打字节奏** — `TypingRhythm.tsx` + `TypingPanel.tsx`
5. **周报** — `WeeklyReport.tsx` + `WeeklyHeatmap.tsx` + `Dashboard.tsx` 入口
6. **导出** — 安装 `html-to-image`，实现 `SaveReportImage`
7. **i18n + 样式** — 翻译和 CSS
8. **构建验证**

## 验证

1. `wails build -skipbindings` 编译通过
2. Dashboard 标题区出现周报图标，点击切换到周报视图
3. 周报显示 5 个指标卡片 + 活跃度热力图 + Insights + 自然语言总结
4. 导出按钮弹出保存对话框，PNG 内容正确
5. 键盘热力图可以切换到手型模式，左右手用不同颜色
6. TypingPanel 底部出现打字节奏波形图
