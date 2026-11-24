# 二十四调试网页2.0互动版

c-na.dev 公开互动作品集的简体中文本地版。

## 本地启动

进入这个文件夹，在 PowerShell 中运行：

```powershell
python local_zh.py
```

浏览器访问 http://127.0.0.1:4186/ 。需要换端口时使用 `python local_zh.py --port 4190`。默认只读本地快照。缓存缺失时需要回源，可使用 `python local_zh.py --online`。

## 在哪里改

| 文件 | 用途 |
| --- | --- |
| `zh-CN.tsv` | 中文文案。每行是英文原文、一个 Tab、中文译文。修改后保存并刷新。 |
| `localize.js` | 页面翻译、动态控件捕获、日期和标签规则，以及五个街机页面的中文操作说明。 |
| `localize.css` | 中文操作说明面板的尺寸、位置和样式。 |
| `local_zh.py` | 本地启动、端口、汉化资源挂载与 HTML 接入。 |
| `mirror.py` | 镜像的缓存、离线回退与页面导航。 |
| `snapshot/` | 原站公开交付的 HTML、压缩脚本、图片、字体、音频及模型。 |

## 汉化范围

首页、案例正文、网页菜单和提示、图片说明及街机操作指南都从本地词典和脚本加载。游戏 WebGL 画布的像素文字、模型和图片里烘焙的文字、终端命令、原始简历 PDF 和站外页面继续使用原文。要改 WebGL 像素字体、3D 游戏规则或 React 组件结构，需在原工程中修改对应组件后重新构建。

## 联调 NotionNext 博客

先在 NotionNext 目录运行 npm run dev，再启动作品集：

    python local_zh.py --port 4187

首屏「开始调试→」默认打开 http://127.0.0.1:3000/ 。上线时用 --blog-url 指定现有博客的正式入口。现有文章、主题、路由与同步由 NotionNext 提供。本地项目如显示示例文章，请核对该环境使用的 NOTION_PAGE_ID。

## 更换摄影作品集封面

替换项目目录的 a7m5素材.png 后，运行 python update_photography.py，再刷新本地预览。脚本会按原尺寸生成软盘贴图、首页封面和现有缓存尺寸。摄影作品集继续使用 /works/giftbede 作为兼容旧链接的地址。

## 电脑界面汉化

桌面菜单、右键菜单、实验与灵感笔记、关于我、职业经历和简历正文使用本地中文词典。终端保留英文命令与文件路径，帮助说明和常见错误提示使用中文。原始简历 PDF 仍保留原文件。

修改内置文档正文词条后运行 `python update_desktop.py`，再强制刷新页面；该脚本同步内置文档的初始内容和终端帮助，并检查修改后的 JavaScript 语法。普通菜单词条只需保存词典并刷新。

## 电脑中的作品分类

职业经历文件夹现按画面调试、声音优化、演播室搭建、户外舞台、摄影作品分类。编辑 `desktop-works.json` 可维护五类文件夹及其子文档，运行 `python update_desktop_works.py` 同步本地快照后强制刷新。保留原文件夹 ID，文档 ID 与内容逐项对应；脚本会校验 JavaScript 语法。

## 电脑中的关于我

编辑 `desktop-about.json`，运行 `python update_desktop_about.py` 同步文案。内容以摄影与直播间调试自我介绍为基础，保留真实经历，按工作方向、画面风格与调试习惯分段。

## 开发板点击彩蛋

开发板保留原有电路动画，每累计点击 10 次弹出确认提示，确认后在当前页前往 https://esp32gallery.com/zh/ ，取消则留在原页并重新计数。刷新页面重置计数。`python update_board_interaction.py` 用于重新接入组件事件，提示逻辑位于 `localize.js`。
