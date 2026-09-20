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
- 学历经历时间轴加入广州二中、中山大学、北京大学校徽
- 21 天滚动预约日期 + 时段状态
- 家长表单：姓名、年级、科目、当前成绩、目标成绩、联系方式、学习问题
- 微信二维码弹窗与移动端固定 CTA
- LocalStorage 静态演示预约
- Supabase 实时数据库接口已预留

## 本地打开

最简单：直接打开 `index.html`。

更推荐启动本地服务器：

```bash
python -m http.server 8080
```

浏览器访问 `http://localhost:8080`。

## 接入 Supabase（让所有家长共享真实预约状态）

1. 新建 Supabase Project。
2. 在 SQL Editor 执行 `supabase-schema.sql`。
3. 在 `booking_slots` 表录入你开放的日期与时间。
4. 修改 `js/config.js`：

```js
window.HE_TUTOR_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "你的 anon public key"
};
```

5. 刷新网页。网站会自动读取数据库中的时段，并通过 RPC 原子提交预约，避免两位家长同时抢到同一时段。

### 安全说明

- 前端只能放 `anon public key`，绝不要放 `service_role key`。
- 家长提交信息储存在 `tutor_inquiries`；匿名访客没有读取权限。
- 访客只可读取 `booking_slots` 的预约状态。
- 如果以后需要“老师后台”，建议单独做登录保护的 Admin 页面，而不是把管理员密钥放在静态网页。

## 目录

```text
he-tutor-site/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   └── main.js
├── assets/
│   ├── teacher-he.webp
│   ├── wechat-qr.webp
│   ├── favicon.svg
│   └── school-logos/
│       ├── guangzhou-no2.png
│       ├── sun-yat-sen.svg
│       └── peking-university.svg
├── supabase-schema.sql
└── README.md
```

## GitHub Pages 一键部署

项目已经包含 `.github/workflows/deploy-pages.yml`。推送到 GitHub 的 `main` 分支后即可通过 GitHub Actions 自动部署。

第一次使用时，在仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。详细步骤见 `DEPLOY-GITHUB.md`。
