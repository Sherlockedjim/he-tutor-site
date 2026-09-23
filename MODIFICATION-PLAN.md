# 校徽版网站修改与 GitHub 部署说明

## 本次修改

- `index.html`：在“广州二中 / 中山大学 / 北京大学”三个教育经历节点加入校徽。
- `css/style.css`：新增校徽尺寸、圆形白底、阴影和右下角编号样式，并适配手机端。
- `assets/school-logos/`：加入三个本地资源文件，网站运行时不依赖外部图片链接。
- `.github/workflows/deploy-pages.yml`：修正原来的 `deplot-pages.yml` 文件名拼写，保证 GitHub Actions 能识别。
- `js/main.js`：本次不需要改动；原有预约、Tab、动画和表单逻辑保持不变。

## 预约审核版补充

- `index.html`：预约区改为未来三周、周一至周日列、每小时方块的多日期选择界面，并加入查询码查询。
- `css/booking.css`：预约周视图、状态方块、家长表单和隐私提示样式。
- `js/booking-v2.js`：多日期连续 2–3 小时选择、实时刷新、提交预约、查询码查询。
- `admin.html`、`css/admin.css`、`js/admin.js`：单管理员登录、开放/关闭时间、审核预约、筛选和 Excel 导出。
- `supabase-schema.sql`：时间片锁定、待审核/已确认/拒绝/取消状态流转、管理员权限和实时更新配置。

## 上传到 GitHub

1. 下载并解压本 ZIP。
2. 打开解压后的文件夹，确认第一层直接看到 `index.html`、`assets`、`css`、`js` 和 `.github`。
3. 进入 `Sherlockedjim/he-tutor-site`，点击 **Add file → Upload files**。
4. 把解压文件夹里的全部内容拖进去，不要把 ZIP 文件本身上传进去。
5. 提交信息填写 `Add school logos to education timeline`，点击 **Commit changes**。
6. 打开 **Settings → Pages**，将 Source 设置为 **GitHub Actions**。
7. 打开 **Actions**，等待 `Deploy GitHub Pages` 显示绿色成功。

如果浏览器上传时漏掉了以点号开头的 `.github` 文件夹，请在 **Actions → set up a workflow yourself** 中手动创建 `.github/workflows/deploy-pages.yml`，或者使用 GitHub Desktop 上传整个项目文件夹。

## 预期网址

`https://Sherlockedjim.github.io/he-tutor-site/`

GitHub 用户名通常会自动转为小写，因此实际访问时也可以使用：

`https://sherlockedjim.github.io/he-tutor-site/`
