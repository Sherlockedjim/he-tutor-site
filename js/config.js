/**
 * 数据库配置（可选）
 * 目前留空时，网站自动使用 LocalStorage 作为静态演示数据库。
 * 接入 Supabase 后填写下面两个值并把 USE_SUPABASE 改为 true。
 * 注意：只使用公开的 anon key；绝不要把 service_role key 放进前端。
 */
window.HE_TUTOR_CONFIG = {
  USE_SUPABASE: false,
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
