# 242424.help 部署配置

建议两个 Vercel 项目分别部署：

| 项目 | 根目录 | 域名 | 用途 |
| --- | --- | --- | --- |
| 互动展示 | 本目录 | 242424.help | 个人展示、3D 桌面与互动 |
| NotionNext | ../NotionNext | blog.242424.help | Notion 内容展示与服务端刷新 |

子域名方案已确认。博客沿用现有项目：https://vercel.com/ggllww110011-4837s-projects/notion-next 。不要将两个项目的 `/_next/` 静态资源混在同一个根路径。

已通过连接的 Notion 插件核对内容库“二十四调试”：数据库 ID `3bbac63423f9826c83b801ba5b99a1df`，数据源 ID `02dac634-23f9-8271-aab6-07d76bcd9b6e`。两者不可互换；现有 NotionNext 的 NOTION_PAGE_ID 使用数据库页面 ID。配置中心页面 ID 为 `6e5ac63423f98251b5dd810615021285`，其启用项可能覆盖 Vercel 环境变量，正式切换域名前需核对其中的 LINK 等设置。

## 互动项目

使用 Other 框架预设，采用本目录 vercel.json 配置。环境变量 BLOG_URL 设置博客正式 HTTPS 地址。构建命令 `python build_vercel.py` 将模型、脚本、图片、音频等资源导出到 public，由 CDN 提供；HTML 与必要的查询变体由只读 Python Function 处理，不运行本地常驻服务器，也不回源覆盖快照。

为项目添加 242424.help 后，按 Vercel 实际返回的 DNS 记录配置域名。不要在未确认现有域名用途前覆盖 DNS。先验收预览部署，再验证正式域名。

## 博客项目

使用 Next.js 预设；服务端部署，不使用静态 export。设置：

- NOTION_PAGE_ID：实际内容根页面或数据库配置，不能沿用示例 ID。
- NEXT_PUBLIC_LINK：https://blog.242424.help（按最终域名调整）。
- NEXT_PUBLIC_REVALIDATE_SECOND：60。
- REVALIDATION_TOKEN：在 Vercel 中设置长随机值，仅供服务端刷新。
- REDIS_URL：按需配置，不是必填。
- 访问凭据：依实际使用的数据读取管道配置。

当前正文仍走 notion-client 的读取管道；NOTION_API_TOKEN 只在已有的官方 API 补充管道中使用。若要求所有文章都由官方 Integration API 读取，需要单独实现与测试正文/数据库适配，不能以设置 Token 替代。网站读取内容不需要授予写入权限；在 Notion App 中编辑仍由本人完成。

缓存刷新详见 ../NotionNext/docs/notion-content-refresh.md。绑定域名、Notion 权限和生产内容同步必须在实际账户中验收；本目录中的配置文件不代表已经部署成功。
