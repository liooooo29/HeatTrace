# HeatTrace 设计文档

## 1. 项目概述

HeatTrace 是一个跨平台（macOS / Windows / Linux）桌面应用，用于监控和记录用户的键盘输入与鼠标轨迹，数据本地存储为 JSON 文件，并提供现代化的数据分析和可视化界面。

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Wails v2 (Go 1.23 + React 18 + TypeScript) |
| 键盘/鼠标监听 | gohook (跨平台) |
| 数据存储 | JSON 文件（按日分文件） |
| 前端 UI | Tailwind CSS |
| 图表库 | Recharts |
| 热力图 | heatmap.js (鼠标) + Canvas 自绘 (键盘) |
| 系统托盘 | Wails v2 内置 systray |
| 构建工具 | Vite 3 |

## 3. 项目结构

```
HeatTrace/
├── main.go                        # Wails 入口 + 托盘初始化
├── app.go                         # App 结构体，Wails 方法绑定
├── monitor/
│   ├── monitor.go                 # 监控服务生命周期管理
│   ├── keyboard.go                # 键盘事件监听 + 敏感过滤
│   └── mouse.go                   # 鼠标事件监听（移动 + 点击）
├── storage/
│   ├── storage.go                 # 存储接口定义
│   ├── json_store.go              # JSON 文件存储实现
│   └── aggregator.go             # 数据聚合/查询
├── analytics/
│   ├── keyboard_stats.go          # 按键频率/组合分析
│   ├── mouse_stats.go             # 鼠标轨迹/点击分布分析
│   ├── typing_speed.go            # 打字速度分析
│   ├── usage_time.go              # 使用时长统计
│   └── heatmap.go                 # 热力图数据生成
├── filter/
│   └── sensitive.go               # 敏感内容过滤器
├── tray/
│   └── tray.go                    # 系统托盘管理
└── frontend/
    └── src/
        ├── App.tsx                # 主应用组件 + 路由
        ├── components/
        │   ├── Dashboard.tsx      # 概览面板
        │   ├── KeyboardPanel.tsx  # 键盘分析面板
        │   ├── MousePanel.tsx     # 鼠标分析面板
        │   ├── UsagePanel.tsx     # 使用时长面板
        │   ├── TypingPanel.tsx    # 打字速度面板
        │   ├── HeatmapView.tsx    # 热力图组件
        │   ├── ThemeToggle.tsx    # 主题切换
        │   └── DateRangePicker.tsx # 时间范围选择
        ├── hooks/
        │   └── useTheme.ts        # 主题 hook
        ├── styles/
        │   └── variables.css      # CSS 变量（深色/浅色）
        └── types/
            └── index.ts           # TypeScript 类型定义
```

## 4. 数据存储方案

### 4.1 文件结构

```
~/.heattrace/
├── config.json                    # 用户配置
├── data/
│   ├── 2026-04-19.json            # 按日原始事件数据
│   ├── 2026-04-20.json
│   └── ...
└── analytics/
    ├── 2026-04-19.summary.json    # 预计算日摘要（可选）
    └── ...
```

跨平台数据目录：
- macOS: `~/Library/Application Support/HeatTrace/`
- Windows: `%APPDATA%/HeatTrace/`
- Linux: `~/.config/heattrace/`

### 4.2 单日 JSON 数据结构

```json
{
  "date": "2026-04-19",
  "keyboard": [
    {
      "ts": 1713523200000,
      "key": "a",
      "modifiers": ["shift"],
      "app": "com.google.Chrome",
      "filtered": false
    }
  ],
  "mouse": {
    "moves": [
      { "ts": 1713523200000, "x": 512, "y": 384, "screen_w": 1920, "screen_h": 1080 }
    ],
    "clicks": [
      { "ts": 1713523200000, "x": 512, "y": 384, "button": "left", "app": "com.google.Chrome" }
    ]
  }
}
```

### 4.3 关键设计决策

- **按日分文件** — 文件不会无限增长，查询按天加载，旧数据归档/删除方便
- **鼠标移动采样** — 每 100ms 采样一次（约 10 条/秒），平衡精度和体积
- **坐标归一化** — 同时记录绝对坐标和屏幕分辨率，支持多显示器/不同分辨率的热力图
- **敏感过滤** — `filtered: true` 的条目不记录 key 内容，只记录时间戳和 app
- **日摘要文件** — 后台定期生成，包含当天按键总数、鼠标移动距离、活跃时长等，加速仪表盘加载

### 4.4 用户配置 (config.json)

```json
{
  "monitor_enabled": true,
  "mouse_sample_interval_ms": 100,
  "blacklisted_apps": ["com.1password.1password", "com.agilebits.onepassword7"],
  "theme": "auto",
  "data_retention_days": 90
}
```

## 5. 键盘/鼠标监控

### 5.1 键盘监控

- 使用 gohook 库监听全局键盘事件
- 捕获：按键名称、修饰键状态、当前前台应用 bundle ID
- 事件通过 Go channel 发送到存储层，不阻塞监听循环
- 敏感过滤：
  1. **密码框检测** — macOS 通过 Accessibility API 检测安全输入框；Windows 通过 UI Automation 检测
  2. **应用黑名单** — 用户可在 config 中配置不记录的应用列表
  3. **快捷键触发** — 用户可设置快捷键临时暂停/恢复记录

### 5.2 鼠标监控

- **移动轨迹**：每 100ms 采样一次当前鼠标坐标
- **点击事件**：记录每次点击的坐标、按钮类型、目标应用

### 5.3 敏感过滤实现

```
filter/sensitive.go

type SensitiveFilter struct {
    blacklistedApps map[string]bool
    enabled         bool
}

func (f *SensitiveFilter) ShouldFilter(keyEvent KeyEvent) bool
func (f *SensitiveFilter) IsPasswordInput() bool  // 平台特定实现
```

- **macOS**：CGO 调用 Accessibility API (`AXUIElement`) 获取焦点元素角色
- **Windows**：`UIAutomation` COM 接口检测 `IsPasswordProperty`
- **Linux**：v1 启用应用黑名单 + 窗口标题关键词匹配

## 6. 数据分析

### 6.1 分析维度

| 分类 | 指标 |
|------|------|
| 键盘 | 按键频率统计、Top 20 按键、修饰键组合（Ctrl+C 等）、键盘热力图 |
| 鼠标 | 屏幕热力图（移动+点击）、点击分布、鼠标移动距离趋势 |
| 使用时长 | 每日活跃时长、每周/月趋势、应用使用时间占比 |
| 打字速度 | CPM/WPM 趋势、按小时分布（哪个时段最快） |

### 6.2 数据流

```
gohook 事件流 → monitor (channel) → storage (写入 JSON)
                                        ↓
                              analytics (按需聚合) → Wails binding → 前端渲染
```

Go analytics 层通过 Wails binding 暴露以下方法给前端：
- `GetDailySummary(date string) DailySummary`
- `GetKeyboardStats(startDate, endDate string) KeyboardStats`
- `GetMouseStats(startDate, endDate string) MouseStats`
- `GetTypingSpeed(startDate, endDate string) TypingSpeed`
- `GetUsageTime(startDate, endDate string) UsageTime`
- `GetHeatmapData(startDate, endDate string) HeatmapData`
- `GetConfig() Config`
- `SaveConfig(config Config)`

## 7. UI 设计

### 7.1 布局

顶部标签式导航，无侧边栏：

```
┌──────────────────────────────────────────────────┐
│  HeatTrace    Overview  Keyboard  Mouse          │
│               Usage     Typing    Settings    ◑  │
├──────────────────────────────────────────────────┤
│                                    [日期范围选择]  │
│                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ 12,453  │ │ 2.3 km  │ │ 6h 23m  │ │ 58 WPM  │ │
│  │ keys    │ │ mouse   │ │ active  │ │ speed   │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                   │
│  [图表区域]                                        │
│                                                   │
└──────────────────────────────────────────────────┘
```

### 7.2 页面说明

- **Overview（默认）**：今日摘要卡片 + 各维度缩略图表预览
- **Keyboard**：键盘热力图 + 按键 Top 20 + 修饰键组合分析
- **Mouse**：屏幕热力图 + 点击分布 + 移动距离趋势
- **Usage**：每日活跃时长柱状图 + 周/月趋势 + 应用时间占比饼图
- **Typing**：CPM/WPM 趋势折线图 + 按小时分布面积图
- **Settings**：监控开关、敏感过滤配置、数据保留天数、主题切换

### 7.3 主题

- CSS 变量定义 `--bg`, `--fg`, `--accent`, `--card-bg`, `--border` 等
- Tailwind CSS 管理样式，dark mode 通过 class 切换
- 支持深色、浅色、跟随系统三种模式

### 7.4 技术选型

- **Tailwind CSS** — 工具类 CSS 框架
- **Recharts** — React 图表库（折线图、柱状图、饼图、面积图）
- **heatmap.js** — 鼠标移动/点击屏幕热力图
- **Canvas API** — 键盘布局热力图（自绘键盘形状 + 热力叠加）

## 8. 系统托盘与应用生命周期

### 8.1 托盘菜单

```
┌─────────────────────┐
│  HeatTrace           │
│  ─────────────────── │
│  ● Monitoring: ON    │  ← 点击切换
│  Open Dashboard      │  ← 打开主窗口
│  ─────────────────── │
│  Quit HeatTrace      │
└─────────────────────┘
```

### 8.2 生命周期

1. **启动** — 自动开始监控，创建系统托盘图标，主窗口不自动打开
2. **托盘图标** — 双击/右键打开主窗口
3. **监控开关** — 托盘菜单或主窗口设置中控制
4. **退出** — 托盘菜单"退出"完全退出（停止监控 + 关闭窗口）
5. **关闭窗口** — 只隐藏窗口，不退出应用

### 8.3 平台适配

- **macOS**：`Info.plist` 配置 `LSUIElement: true`，不在 Dock 显示
- **Windows**：托盘图标在系统通知区域
- **Linux**：Wails v2 内置 systray 支持主流桌面环境

## 9. 实现顺序

1. **Phase 1** — 键盘/鼠标监控 + JSON 存储（核心功能）
2. **Phase 2** — 系统托盘 + 应用生命周期
3. **Phase 3** — 数据分析层（Go analytics）
4. **Phase 4** — 前端 UI（概览 + 各分析面板）
5. **Phase 5** — 敏感过滤 + 设置页面
6. **Phase 6** — 打包构建 + 跨平台测试
