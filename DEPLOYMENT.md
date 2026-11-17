# Cloudflare Pages 部署说明

本站是纯静态 HTML / CSS / JavaScript，不需要服务器、npm 或额外框架。原下载地址、图片、视频及联系方式保持不变。

## 已连接 Git 的项目

1. 将本目录的网页和新增文件同步到原来已连接 Pages 的仓库。不要只上传 HTML，assets/site.js、assets/tools.js、style.css 也要一起提交。
2. 保留现有 Git 集成和生产分支。提交并推送该分支后，由 Pages 自动部署。
3. Framework preset 选择 None；Build command 可设 `exit 0`。如果已有可用配置，不必无故更换。
4. 如果本目录就是仓库根，Root directory 留空，Build output directory 为 `.`。如果仓库内另有 site 子目录，Root directory 设为 `site`，Build output directory 为 `.`。
5. 发布前可先通过预览部署验证，再检查生产域名。下载文件由原 Gitee 链接提供，Pages 不托管 APK。

## 路由与缓存

- 保持 Pages 默认的 HTML 简洁路由：`/tv` 对应 tv.html，`/changelog` 对应 changelog.html。
- 根目录的 404.html 用于不存在的页面，不要添加把所有地址重写到首页的 SPA 通配规则。
- _redirects 保持原有内容。未新增长时间浏览器缓存或严格 CSP，不影响外部视频、下载及查询工具。
- 默认使用 Pages 的静态资源缓存机制。CSS / JS 引用带更新标记，后续修改时同步更新引用标记。
- DEPLOYMENT.md 和 CHANGELOG.md 均为公开说明，不要在其中填写密钥或私有配置。

## 本次检查与发布边界

- 电视版日期 2026-11-17，APK 实际声明 1.0.0（1），32/64 位合一。用户已确认新 APK 已覆盖原下载地址；链接未改。
- 手机版信息保留原包，不把电视版修复描述为手机更新。
- 本地目录 F:\gongchuang\site 未检测到 Git 工作区；本次只更新本地文件，不初始化仓库、不提交、不推送。需由维护者同步到既有 Git 仓库。
- 本地静态服务和浏览器验证不等同于 Cloudflare 线上域名验证。
