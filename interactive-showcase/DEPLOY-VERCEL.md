# 242424.help 当前部署方案

用户已确认使用同域路径：`https://242424.help/` 为互动展示，`https://242424.help/blog` 为 NotionNext 内容区。无需新增 blog DNS。

正式入口使用原 `notion-next` 项目。根目录 `api/showcase.py` 挂载只读展示处理器，`vercel.json` 将展示页面和资源转给它；Next.js 使用 `BLOG_BASE_PATH=/blog`，资源与接口在 /blog 下运行。`NEXT_PUBLIC_LINK` 和 Notion 配置中心 LINK 都设为 `https://242424.help/blog`。

独立 `ershisi-showcase` 项目保留为展示构建验证版本，不承担正式域名。此前文档中的 blog 子域名方案已被替换。

Notion 内容数据库 ID：`3bbac63423f9826c83b801ba5b99a1df`。配置中心页面 ID：`6e5ac63423f98251b5dd810615021285`。凭据仍仅配置在 Vercel。

发布前验证：首页、/explore、/blog、文章页、/blog/_next/ 静态资源、图片和 API。缓存刷新说明参见 ../docs/notion-content-refresh.md。

## 搜索引擎抓取入口

Google Search Console 提交 `https://www.242424.help/sitemap.xml`。
根目录地图是索引，包含 `/sitemap-public.xml`（作品集和独立游戏页面）与
`/blog/sitemap.xml`（NotionNext 动态内容）。根目录 `/robots.txt` 声明该索引。
前三个根目录入口由 `api/showcase.py` 独立提供，不依赖 Notion 请求。
`vercel.json` 必须保留它们的根目录重写规则；Next.js 的 `/blog` basePath
不会自动把博客地图或 robots.txt 暴露在域名根目录。

上线后验证 GET 和 HEAD 返回 200、XML 可解析、两个子地图可访问，再重新提交。
Google 接受提交不代表已经完成抓取或收录，报告需要等待其重新处理。
