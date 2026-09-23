# 何老师 · Private Tutor Website

高端个人家教品牌站静态版。PC、iPad、手机响应式，直接双击 `index.html` 即可预览。

## 已实现

- 冰川蓝 / 深海军蓝专业视觉
- 大幅半身像 + 柔和渐隐
- Sticky 导航、滚动进度、渐入动画、数字动画
- PC 端鼠标光晕、轻量 3D Tilt、Magnetic Button 互动
- 数学 / 英语科目 Tab
- 教育心理 / 记忆训练 / 考前状态方法卡片展开
- 三段真实提分案例
- 学历经历时间轴加入广州二中、中山大学校徽
- 未来三周周视图预约日历：周一至周日列、每小时方块、多日期选择
- 家长表单：姓名、性别、年级、科目、成绩、联系方式、地点、预期价格、学习问题
- 微信二维码弹窗与移动端固定 CTA
- 8 位数字查询码和状态查询
- Supabase 实时预约、人工审核和管理员后台

## 预约审核版使用方法

当前版本新增了 `admin.html` 管理后台，预约日历改为未来三周的周视图：周一至周日为列，每小时为一个时间片。家长可以在多个日期分别选择连续 2–3 小时；提交后时间片进入“审核中”，老师确认后进入“已预约”，拒绝或取消后自动释放。

### 第一次配置 Supabase

1. 注册 Supabase 并新建 Project。这个项目可以先使用 Free 计划。
2. 在 Supabase 的 SQL Editor 中执行本目录的 `supabase-schema.sql`。
3. 打开 Authentication → Users，创建一个邮箱密码用户。
4. 复制这个用户的 UUID，在 SQL Editor 中执行：

```sql
insert into public.admin_users(user_id, email)
values ('Authentication 用户 UUID', '管理员邮箱');
```

5. 修改 `js/config.js`：

```js
window.HE_TUTOR_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "你的 anon public key"
};
```

6. 部署后访问 `https://你的用户名.github.io/he-tutor-site/admin.html`，使用刚刚创建的管理员邮箱和密码登录。

### 后台使用方法

- 默认未来 21 天全部关闭，在后台点击时间方块即可开放或关闭。
- 可以使用“开放未来21天”或“开放当前周”批量开放时间。
- 家长提交后，相关小时会变成“审核中”，前台实时刷新且不能被再次选择。
- 点击“确认”后显示为“已预约”；点击“拒绝”会填写可选原因并自动释放时间。
- 已确认记录可以点击“取消预约”，取消后对应时间重新开放。
- 预约记录支持按日期、年级、科目、状态、性别和区域筛选，并可导出 Excel。
- 家长提交后获得 8 位数字查询码，可在预约页面查询状态。

### 隐私与密钥

- 前端只放 Supabase `anon public key`，绝不要放 `service_role key`。
- 详细地址、联系方式、预期价格只允许管理员读取，不会通过查询码公开。
- 家长查询码只返回学生、年级、科目、预约时间和审核状态。
- `admin.html` 通过 Supabase Auth 登录，并由 `admin_users` 表限制为指定管理员账号。

## 本地打开

最简单：直接打开 `index.html`。

更推荐启动本地服务器：

```bash
python -m http.server 8080
```

浏览器访问 `http://localhost:8080`。

## 目录

```text
he-tutor-site/
├── index.html
├── css/
│   ├── style.css
│   ├── booking.css
│   └── admin.css
├── js/
│   ├── config.js
│   ├── main.js
│   ├── booking-v2.js
│   └── admin.js
├── admin.html
├── assets/
│   ├── teacher-he.webp
│   ├── wechat-qr.webp
│   ├── favicon.svg
│   └── school-logos/
│       ├── guangzhou-no2.png
│       ├── sun-yat-sen.svg
├── supabase-schema.sql
└── README.md
```

## GitHub Pages 一键部署

项目已经包含 `.github/workflows/deploy-pages.yml`。推送到 GitHub 的 `main` 分支后即可通过 GitHub Actions 自动部署。

第一次使用时，在仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。详细步骤见 `DEPLOY-GITHUB.md`。
