# GitHub Pages 部署说明

这个项目已经配置好 GitHub Actions。上传到 GitHub 后，每次向 `main` 分支提交代码都会自动重新部署网站。

## 第一次部署

1. 在 GitHub 新建一个 **Public** repository，例如：`he-tutor-site`。
2. 将本项目全部文件上传到仓库根目录。
3. 打开仓库：`Settings → Pages`。
4. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
5. 打开 `Actions`，等待 `Deploy tutor site to GitHub Pages` 变为绿色。
6. 部署完成后，网站地址通常为：

   `https://<你的用户名>.github.io/he-tutor-site/`

当前 GitHub 用户若为 `tessegpt`，仓库名为 `he-tutor-site`，则地址通常为：

`https://tessegpt.github.io/he-tutor-site/`

## 以后更新

只需要修改文件并 push 到 `main`。GitHub Actions 会自动更新线上网站。

## 数据库

当前网站预约功能需要接入 Supabase 才能实现多设备共享、人工审核、查询码和实时日历。请按 `README.md` 执行 `supabase-schema.sql`、创建唯一管理员账号，并修改 `js/config.js`。

管理员后台地址为：

`https://<你的用户名>.github.io/he-tutor-site/admin.html`

**不要把 Supabase `service_role` key 放到 GitHub 或网页中。** 前端只允许使用 `anon public key`。
