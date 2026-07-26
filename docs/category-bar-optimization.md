# CategoryBar 位置优化方案

## 当前结构

```
.main-grid
├── .sidebar-left-grid          (左侧栏)
├── .content-wrapper
│   ├── .category-bar.glass     ← 当前位置
│   │   └── .category-bar-inner (分类 pill 导航)
│   └── .main-content
│       └── <Outlet />          (页面内容)
└── .sidebar-right-grid         (右侧栏)
```

## 方案 1：去掉 `.glass` 包裹，让 pill 更轻盈（推荐）

**改动点：**
- CategoryBar.tsx: 移除 `glass` class
- index.css: 调整 `.category-bar` 样式，添加适当的底部间距

**效果：** pills 不再有卡片背景/边框/模糊，像原生分类筛选条自然融入内容区。

---

## 方案 2：移到 `.main-content` 内部

**改动点：**
- Layout.tsx: 将 `<CategoryBar />` 移到 `<main className="main-content">` 内部
- 如果使用了 `<Outlet />` 包裹路由内容，需要决定显示在所有子页面还是特定页面

**效果：** CategoryBar 出现在 Hero 区域之后/文章列表之前，更符合"内容筛选"语义。

---

## 方案 3：保持当前位置 + 去掉 `.glass` + 缩小

**改动点：**
- CategoryBar.tsx: 移除 `glass` class
- index.css: 缩小 `.category-bar-inner` 的内边距
- 可以添加视觉分隔（如下边框或分隔线）区分导航和内容区域

**效果：** 保持位置不变，但视觉上更精简，与 header 风格对齐。

---

## 方案 4：条件渲染 — 只在家/分类页显示

**改动点：**
- CategoryBar.tsx 或 Layout.tsx: 通过路由判断当前页面
- 仅在 `/` 首页和 `/category/*` 分类页渲染 CategoryBar
- 文章详情页 `/post/*`、关于页等隐藏

**效果：** 避免在不需要分类筛选的页面出现无意义的导航条。
