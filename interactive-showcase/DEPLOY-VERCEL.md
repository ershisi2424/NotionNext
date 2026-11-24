# 242424.help 当前部署方案

用户已确认使用同域路径：`https://242424.help/` 为互动展示，`https://242424.help/blog` 为 NotionNext 内容区。无需新增 blog DNS。

正式入口使用原 `notion-next` 项目。根目录 `api/showcase.py` 挂载只读展示处理器，`vercel.json` 将展示页面和资源转给它；Next.js 使用 `BLOG_BASE_PATH=/blog`，资源与接口在 /blog 下运行。`NEXT_PUBLIC_LINK` 和 Notion 配置中心 LINK 都设为 `https://242424.help/blog`。

独立 `ershisi-showcase` 项目保留为展示构建验证版本，不承担正式域名。此前文档中的 blog 子域名方案已被替换。

Notion 内容数据库 ID：`3bbac63423f9826c83b801ba5b99a1df`。配置中心页面 ID：`6e5ac63423f98251b5dd810615021285`。凭据仍仅配置在 Vercel。

发布前验证：首页、/explore、/blog、文章页、/blog/_next/ 静态资源、图片和 API。缓存刷新说明参见 ../docs/notion-content-refresh.md。
