# 互动展示区优化清单

约束：保持内容、样式、模型、灯光、音频与交互行为；博客刷新策略独立维护。

## 已实施

- 桌面宽度下不再因 `useDeviceTier()` 返回 `lite` 而移除首页和菜单探索入口，避免后续调试链接一并缺失。保留原 ExploreLink 导航和完整场景能力判断，不强制启动 WebGL。
- 汉化词典在脚本执行时并行下载，页面 load 后才处理 DOM；通过 fetch preload 提前发现资源。提前注册拒绝处理，避免页面加载较慢时出现未处理的 Promise 拒绝。
- 八组固定导航文案（作品、关于、游戏空间、联系方式、桌面入口及滚动提示）直接写入已有 HTML、客户端模块和对应 RSC 快照；词典保留兼容入口，不删除交互逻辑。

## 本轮资源与扫描优化

- 中文生成：先运行 `node interactive-showcase/compile_chinese.cjs`，再生成资源版本。编译器按语法节点处理客户端文字、HTML 文本及属性、Flight 页面数据与 UTF-8 长度记录，输出 `native-zh.json`。Python 服务和 CDN 导出直接使用中文内容；不修改程序标识符、对象键、链接路径或二进制素材。构建核对词典、生成器及快照输入，防止漏编译。
- 手机首屏：桌面派生的调试入口带独立断点标记；手机只显示一组“开始调试 / 查看我的作品”，按钮同宽，标题适配窄屏，移除首屏文字区域的多余最小高度。
- 标签标题：中文生成时清理原作者姓名，客户端在 React 后续更新标题时再次校验，不影响正文或正常站点品牌名。
- 作品图片：沿用现有渐进图片淡入，不新增视觉效果。高清图解码完成并提交初始隐藏帧后才淡入；缓存命中同样遵守此顺序，占位层保留至原有淡入时长结束。减少动态效果偏好下直接显示。作品链接仅按悬停/焦点少量预取文档，开启节省流量时跳过。

- 资源按内容计算版本，页面及版本内脚本/CSS使用 `/__showcase/v/<version>/...`。仅此路径设置一年 immutable 缓存，原路径保持默认重新验证；博客及 Notion API 不应用此规则。
- 328 组已缓存图片的 url/w/q 参数生成精确 Vercel 静态路由，页面使用 `/__showcase-image` 避开平台内置 Next Image 的重新编码，图片原始响应字节逐一核对；未匹配请求仍走原函数回退。
- 保留词典提前下载与 load 后处理 DOM 的顺序，版本内脚本与 HTML preload 指向同一版本词典。
- MutationObserver 只扫描新增节点或变化的文本，合并父子节点；按首页/菜单、摄影、声卡、直播案例、联系方式和电脑窗口区域触发内容同步。
- 修改互动资源后运行 `python interactive-showcase/asset_pipeline.py`，提交生成的 `asset-manifest.json` 与根 `vercel.json`。构建校验内容版本，忘记更新时构建会失败，避免发布陈旧的 immutable 内容。随后运行 `python interactive-showcase/build_vercel.py --output public/__showcase-assets` 和 `python -m unittest discover -s interactive-showcase -p test_asset_pipeline.py -v`。

## 后续优化（尚未实施）

- 将开始调试入口与 DOM 注入彻底解耦，迁移为可维护的组件源码。
- 分批迁移剩余文案与新增内容，逐步缩减 MutationObserver 的处理范围。
- 根据浏览器性能记录评估字体预加载和模型下载优先级，不降低素材质量。

## 验证

- 对全部 54 个快照 JavaScript 响应和 localize.js 执行语法检查。
- 本地专用验证服务将 `/?tier=lite` 映射至首页快照，浏览器仍读取 tier 参数，验证桌面轻量模式的入口显示、开始调试跳转及后退恢复。
- 此验证不等同于对 360 极速浏览器所有版本、显卡驱动和扩展组合的兼容保证。

首页与作品页共用 navigation.js：沿用原有 96px 棋盘格、260ms 单格过渡与错峰顺序，页面头部统一接管导航。同页锚点只滚动，不重新请求文档；跨页锚点在首页初始化期间短暂校准，用户输入立即取消。内部返回首页保留已访问状态，避免重复欢迎框。验证：node interactive-showcase/test_navigation.cjs。
