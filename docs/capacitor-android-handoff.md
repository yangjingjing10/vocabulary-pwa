# Android 手机版接入任务（Capacitor）

> 给新窗口 AI / 开发者：在本仓库现有 Vue 3 + Vite PWA 上接入 **Capacitor Android**，产出可安装的 APK。  
> 用户目标：**不想再依赖 Netlify 部署更新**，本地 build 出 APK 装手机即可。

---

## 1. 项目现状

| 项 | 说明 |
|---|---|
| 框架 | Vue 3 + TypeScript + Vite 6 |
| 路由 | 无 vue-router，`App.vue` 的 `activeView` 切换 |
| 数据 | IndexedDB（idb），含独立 font-db / wallpaper-db |
| 静态资源 | `public/dict/*.json`（离线词库，约数 MB） |
| PWA | `vite-plugin-pwa` + `src/services/pwa-update.service.ts` |
| 远程仓库 | https://github.com/yangjingjing10/vocabulary-pwa.git ，分支 `main` |
| 工作区 | `d:\NewDesktop\myproject\背单词软件` |
| 用户系统 | Windows 10，目标设备 **Android 手机** |

功能清单见仓库根目录：`界面功能和集成.txt`

---

## 2. 为什么选 Capacitor 而不是 Tauri

- 用户主要用 **Android 手机**
- Capacitor 对现有 Vite Web 项目改动最小，APK 打包路径成熟
- Tauri 手机版配置更重（Rust + Android SDK 复杂度高）

---

## 3. 必须处理的兼容点

### 3.1 PWA Service Worker（Capacitor 内应禁用或跳过）

Capacitor 使用 `capacitor://` / `https://localhost` WebView，**不要再注册 Service Worker**，否则和原生壳冲突、更新逻辑无意义。

**建议：**

```ts
// src/utils/is-native-app.ts
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()
}
```

- `src/App.vue`：`initPwaUpdate()` 仅在 `!isNativeApp()` 时调用
- `vite.config.ts`：可用 `process.env.CAPACITOR === 'true'` 或 build 模式 `capacitor` 时 **不加载 VitePWA 插件**

### 3.2 Vite base / 资源路径

Capacitor 加载本地 `dist`，默认 `base: '/'` 即可。确认 `index.html`、字体、壁纸、dict 路径在 WebView 内可访问。

### 3.3 RSS 新闻源（CORS）

`src/services/rss.service.ts`：

- 开发：`/api/rss-proxy`（Vite dev server 中间件，**Capacitor 打包后不存在**）
- 生产：走 `https://api.allorigins.win/raw?url=...`

**Android 原生包应始终走 allorigins（或 Capacitor Http 插件）**，不要依赖 Vite 代理。

建议改法：

```ts
import { isNativeApp } from '@/utils/is-native-app'

export async function fetchRssXml(feedUrl: string): Promise<string> {
  if (import.meta.env.DEV && !isNativeApp()) {
    try { return await fetchViaLocalProxy(feedUrl) } catch { /* fallback */ }
  }
  return await fetchViaAllOrigins(feedUrl)
}
```

### 3.4 网络权限（AndroidManifest）

Android 需要 Internet 权限（Capacitor 默认通常有）。若 API 走 HTTPS，检查 **Android 9+ 明文 HTTP** 是否被拦截（本项目 LLM API 用户自配，一般 HTTPS）。

### 3.4 相机 / 文件（单词导入 OCR）

`WordImportPage` 可能用 `<input type="file">` 或相机。Capacitor 上建议后续可加：

- `@capacitor/camera`
- `@capacitor/filesystem`

**第一版**：先验证 Web API 在 WebView 是否可用；不行再接入插件。

### 3.5 语音朗读 Web Speech API

Android WebView 对 `speechSynthesis` 支持因系统而异。第一版不阻塞发布，但需在真机测 `src/services/speech.service.ts`。

### 3.6 安全区 / 状态栏

已有 `viewport-fit=cover`。Capacitor 建议加：

```bash
npm i @capacitor/status-bar @capacitor/splash-screen
```

配置沉浸式状态栏，避免顶栏被刘海遮挡。

### 3.7 应用图标

当前只有 `public/icons/icon.svg`。Android 需要 PNG mipmaps（多尺寸）。

- 用 `@capacitor/assets` 从 SVG/PNG 生成，或
- 手动放 `android/app/src/main/res/mipmap-*`

应用名建议：**背单词** 或 **Vocabulary**

---

## 4. 实施步骤（请按序执行）

### Step 0 — 环境（用户机器 Windows）

用户需安装：

1. **Node.js** 18+（已有）
2. **Android Studio**（含 Android SDK、SDK Platform 34+、Build-Tools）
3. 环境变量：`ANDROID_HOME` 或 `ANDROID_SDK_ROOT`，`platform-tools` 在 PATH
4. JDK 17（Android Studio 自带即可）

验证：`adb devices` 能识别手机（USB 调试）

### Step 1 — 安装 Capacitor

```bash
cd "d:\NewDesktop\myproject\背单词软件"
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install -D cross-env
```

### Step 2 — 初始化

```bash
npx cap init "背单词" com.vocabulary.app --web-dir dist
```

生成 `capacitor.config.ts`，建议内容：

```ts
import type { CapacitorConfig } from '@capacitor/core'

const config: CapacitorConfig = {
  appId: 'com.vocabulary.app',
  appName: '背单词',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // 避免部分 Web API 限制
  },
}

export default config
```

### Step 3 — 调整 Vite 构建

`package.json` 增加脚本：

```json
{
  "scripts": {
    "build:app": "vue-tsc -b && vite build",
    "cap:sync": "npm run build:app && npx cap sync android",
    "cap:open": "npx cap open android",
    "cap:run": "npm run cap:sync && npx cap run android"
  }
}
```

可选：`vite.config.ts` 根据 mode 禁用 PWA：

```ts
const isCapacitorBuild = process.env.CAPACITOR === 'true'
// plugins: [vue(), rssProxyPlugin(), ...(isCapacitorBuild ? [] : [VitePWA({...})])]
```

`build:app` 可设为：`cross-env CAPACITOR=true vue-tsc -b && vite build`

### Step 4 — 添加 Android 平台

```bash
npm run build:app
npx cap add android
npx cap sync android
```

### Step 5 — 代码改动清单（最小集）

| 文件 | 改动 |
|---|---|
| `src/utils/is-native-app.ts` | 新建，判断 Capacitor 原生环境 |
| `src/App.vue` | `initPwaUpdate()` 加 `if (!isNativeApp())` |
| `src/services/pwa-update.service.ts` | `initPwaUpdate` 开头 guard native |
| `src/services/rss.service.ts` | 原生环境跳过 local proxy |
| `vite.config.ts` | Capacitor build 时禁用 VitePWA（可选但推荐） |
| `package.json` | 增加 cap 脚本 |
| `capacitor.config.ts` | 新建 |
| `界面功能和集成.txt` | 追加 Android 构建说明一节 |
| `README.md` | 追加「Android APK 打包」简短步骤 |

**个人中心「检查应用更新」**：原生包可隐藏或改为显示 `package.json` version（无 SW 更新）。

### Step 6 — Android Studio 打包 APK

```bash
npm run cap:sync
npx cap open android
```

Android Studio：

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 或 **Run** 到已连接真机
3. Debug APK 路径：`android/app/build/outputs/apk/debug/app-debug.apk`

### Step 7 — 真机测试清单

- [ ] 冷启动、离线打开（飞机模式）
- [ ] 离线词库首次导入（`public/dict` → IndexedDB）
- [ ] 单词导入（相机/相册）
- [ ] 测验全流程 + IndexedDB 数据保留
- [ ] 今日新闻 RSS 拉取
- [ ] 用户自配 LLM API 调用
- [ ] 壁纸/字体上传与应用
- [ ] 数据备份导出/导入 JSON
- [ ] 按 Home 再进 App，状态正常
- [ ] 旋转屏幕（如不支持可 lock portrait）

### Step 8 — Release 签名（可选，第二版）

Debug APK 只能自用。上架或长期安装需要 keystore 签名。第一版用户只需 **debug APK sideload** 即可。

---

## 5. 不要做的事

- 不要 force push git
- 不要改 git config
- 不要提交 `.env`、API 密钥
- 第一版 **不要** 大重构 vue-router / 改 UI
- 不要删除 PWA 配置（Web 版还要用），仅 native build 时跳过
- 不要引入 Tauri（本任务只做 Capacitor Android）

---

## 6. 完成后

1. `git add` 相关文件（含 `android/` 若团队决定入库；或 `.gitignore` android 仅保留配置 —— **建议 android/ 入库** 方便用户同步）
2. `git commit -m "Add Capacitor Android shell for offline APK builds."`
3. `git push origin HEAD`
4. 给用户：**APK 文件位置** + **以后改代码怎么重新打包**（`npm run cap:sync` → Android Studio Build）

---

## 7. 给用户的交付说明模板

```
Android 版已接入。以后更新不用 Netlify：

1. 改完代码
2. 在项目根目录运行：npm run cap:sync
3. 运行：npx cap open android
4. Android Studio → Build APK
5. 把 app-debug.apk 传到手机安装（需允许「未知来源」）

数据仍在手机本地 IndexedDB，和 PWA 一样。
```

---

## 8. 参考文件路径

```
src/App.vue                          — PWA 更新入口，需 native guard
src/services/pwa-update.service.ts   — SW 注册
src/services/rss.service.ts          — RSS CORS
src/main.ts                          — 入口
vite.config.ts                       — VitePWA + RSS 代理
public/dict/                         — 离线词库 JSON
public/icons/icon.svg                — 应用图标源
界面功能和集成.txt                    — 功能地图
README.md                            — 用户文档
```

---

## 9. 新窗口 AI 启动提示词（复制下面整段）

```
请阅读 @docs/capacitor-android-handoff.md 和 @界面功能和集成.txt，
在本仓库完成 Capacitor Android 接入：

1. 按 handoff 文档 Step 1-8 执行
2. 最小改动：is-native-app guard、RSS 原生路径、Capacitor build 时禁用 PWA SW
3. 生成 android/ 平台，确保 npm run build:app && npx cap sync android 成功
4. 更新 README.md 和 界面功能和集成.txt
5. 完成后 git commit + push origin HEAD

用户环境：Windows 10，目标 Android 手机，仓库 main 分支。
若 Android SDK 未安装，给出清晰安装指引并尽量完成代码侧全部改动。
```
