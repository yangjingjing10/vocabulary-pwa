# 背单词软件（vocabulary-pwa）

Vue 3 + TypeScript + Vite PWA，数据存在本地 IndexedDB，可离线使用。

## 怎么用

1. 安装依赖：`npm install`
2. 本地开发：`npm run dev`
3. 打包：`npm run build`

详细页面与文件说明见：`界面功能和集成.txt`。

## 字体设置说明

路径：个人中心 → 自定义外观 → 字体。

- 可上传本地字体、粘贴字体链接，或选择「系统默认字体」
- **系统默认字体也可以命名保存**（例如「默认阅读」），下次一键载入并带上当时的颜色、字号
- 已保存配置可点选载入、更新或删除（删配置不会删已上传的字体文件）

## 手机桌面版（PWA）怎么更新

安装到桌面后，系统会缓存旧页面，**下拉刷新往往换不来新版本**。

1. 打开 App → 个人中心 → 点「检查应用更新」
2. 有新版本会自动刷新；若仍像旧的，可按提示「清理离线缓存」再刷新（不会删单词数据）
3. 有时底部也会弹出「发现新版本 → 立即更新」

## Android APK 打包（Capacitor）

本地出 APK，不依赖 Netlify 部署更新。

**前置环境（首次）：**

1. 安装 [Android Studio](https://developer.android.com/studio)（勾选 Android SDK、SDK Platform 34+、Build-Tools）
2. 设置环境变量 `ANDROID_HOME`（或 `ANDROID_SDK_ROOT`）指向 SDK 目录，并把 `platform-tools` 加入 PATH
3. JDK 17（Android Studio 自带即可）
4. 手机开启「开发者选项 → USB 调试」，用 `adb devices` 确认已连接

**日常打包：**

```bash
npm install
npm run cap:sync          # = build:app（禁用 PWA SW）+ cap sync android
npx cap open android      # 打开 Android Studio
```

在 Android Studio：`Build → Build Bundle(s) / APK(s) → Build APK(s)`  
Debug APK：`android/app/build/outputs/apk/debug/app-debug.apk`  
传到手机安装时需允许「未知来源」。

数据仍在手机本地 IndexedDB，与 PWA 一致。改代码后重复 `npm run cap:sync` 再 Build 即可。

## 已知改进记录

- 接入：Capacitor Android 壳，支持本地打 APK（`npm run cap:sync`）
- 修复：仅上传字体可保存、选系统默认无法保存的问题（`source=system` 现已支持持久化）
- 修复：单词测验答错后暂停/结果页虚报「全对」——正确率改为按「首次作答」统计；错题重练与掌握结算逻辑不变
- 改进：PWA 自动探活更新 + 个人中心「检查应用更新」入口，解决桌面版难同步
