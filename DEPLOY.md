# 上线清单

## 1. 换掉占位符
`YOURDOMAIN.com` 在三个地方出现，全部替换成你买的域名：

- `index.html` — canonical 标签、og:url、JSON-LD 里的 url
- `robots.txt` — Sitemap 行
- `sitemap.xml` — loc 行

一条命令搞定（把 example.com 换成你的域名）：

    grep -rl YOURDOMAIN.com . | xargs sed -i 's/YOURDOMAIN\.com/example.com/g'

## 2. 上传这些文件到网站根目录

    index.html
    robots.txt
    sitemap.xml
    assets/grid-engine.js

`engine-test.html` 和 `sample-*.pdf` 是内部测试用的，**不要上传**。

## 3. 部署方式
纯静态、零构建、无后端。Cloudflare Pages / Netlify / Vercel 任选，
拖文件夹上去就行。必须是 HTTPS。

## 4. 上线后立刻做
- Google Search Console 验证域名所有权
- 提交 sitemap.xml
- 首页用「网址检查」手动请求编入索引

## 5. 暂时不要做
- 不要挂广告（养站期，至少前 3 个月）
- 不要加统计代码以外的任何第三方脚本
