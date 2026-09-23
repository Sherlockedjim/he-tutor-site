/**
 * 数据库配置
 * 预约审核、后台登录、查询码和实时同步都需要开启 Supabase。
 * 接入 Supabase 后填写下面两个值并把 USE_SUPABASE 改为 true。
 * 注意：只使用公开的 anon key；绝不要把 service_role key 放进前端。
 */
window.HE_TUTOR_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: "https://bjcayrseyffbzfmwqeww.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_HKEoOMRnxuUQpcvTyCrWkQ_xKvmFTzI"
};
