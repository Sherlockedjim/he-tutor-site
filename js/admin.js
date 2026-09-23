(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const config = window.HE_TUTOR_CONFIG || {};
  const canConnect = Boolean(config.USE_SUPABASE && config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase?.createClient);
  const db = canConnect ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;
  const loginCard = $('#adminLoginCard');
  const app = $('#adminApp');
  const loginForm = $('#adminLoginForm');
  const loginMessage = $('#adminLoginMessage');
  const scheduleGrid = $('#adminScheduleGrid');
  const scheduleMessage = $('#scheduleMessage');
  const bookingRows = $('#bookingRows');
  const bookingMessage = $('#bookingMessage');
  const dataStatus = $('#adminDataStatus');
  const weekTitle = $('#adminWeekTitle');
  const prevWeek = $('#adminPrevWeek');
  const nextWeek = $('#adminNextWeek');
  const weekNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const hours = Array.from({ length: 13 }, (_, index) => 9 + index);
  const scheduleMap = new Map();
  let scheduleWeek = 0;
  let allBookings = [];
  let bookingSlots = new Map();
  let toastTimer;

  const pad = value => String(value).padStart(2, '0');
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeValue = hour => `${pad(hour)}:00`;
  const fromISO = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
  const addDays = (date, count) => { const result = new Date(date); result.setDate(result.getDate() + count); return result; };
  const getMonday = date => { const result = new Date(date); result.setHours(0, 0, 0, 0); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return result; };
  const rangeStart = getMonday(new Date());
  const rangeEnd = addDays(rangeStart, 20);
  const todayISO = isoDate(new Date());
  const keyFor = (date, time) => `${date}|${time}`;
  const displayDate = iso => { const date = fromISO(iso); return `${date.getMonth() + 1}月${date.getDate()}日 ${weekNames[(date.getDay() + 6) % 7]}`; };
  const datesForWeek = index => Array.from({ length: 7 }, (_, offset) => addDays(rangeStart, index * 7 + offset));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const statusLabel = status => ({ pending: '审核中', confirmed: '已确认', rejected: '已拒绝', cancelled: '已取消' }[status] || status || '未知');
  const slotStatusLabel = status => ({ available: '开放', closed: '关闭', blocked: '已关闭', pending: '审核中', booked: '已预约' }[status] || status);

  function setMessage(element, message, type = '') {
    if (!element) return;
    element.className = `admin-message${type ? ` ${type}` : ''}`;
    element.textContent = message || '';
  }

  function toast(message) {
    const element = $('#adminToast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }

  async function signIn(event) {
    event.preventDefault();
    if (!db) { setMessage(loginMessage, '尚未配置 Supabase，请先按 README.md 完成配置。'); return; }
    if (!loginForm.checkValidity()) { loginForm.reportValidity(); return; }
    setMessage(loginMessage, '正在登录……');
    const { error } = await db.auth.signInWithPassword({ email: $('#adminEmail').value.trim(), password: $('#adminPassword').value });
    if (error) { setMessage(loginMessage, '登录失败，请检查邮箱、密码和管理员权限。'); return; }
    await showApp();
  }

  async function showApp() {
    const { data } = await db.auth.getUser();
    if (!data?.user) return;
    loginCard.hidden = true;
    app.hidden = false;
    $('#adminIdentity').textContent = data.user.email || '';
    if (dataStatus) dataStatus.textContent = '数据库已连接';
    await initializeSchedule();
    await Promise.all([loadSchedule(), loadBookings()]);
    setupRealtime();
  }

  async function initializeSchedule() {
    if (!db) return;
    const { error } = await db.rpc('initialize_schedule', { p_start_date: isoDate(rangeStart), p_end_date: isoDate(rangeEnd) });
    if (error) setMessage(scheduleMessage, `初始化时间表失败：${error.message}`);
  }

  async function loadSchedule() {
    if (!db) return;
    const { data, error } = await db.from('booking_slots').select('slot_date,slot_time,status').gte('slot_date', isoDate(rangeStart)).lte('slot_date', isoDate(rangeEnd));
    if (error) { setMessage(scheduleMessage, '读取时间表失败，请刷新页面。'); return; }
    scheduleMap.clear();
    (data || []).forEach(row => scheduleMap.set(keyFor(row.slot_date, String(row.slot_time).slice(0, 5)), row.status));
    renderSchedule();
  }

  function renderSchedule() {
    if (!scheduleGrid) return;
    const dates = datesForWeek(scheduleWeek);
    scheduleGrid.innerHTML = '<div class="admin-corner"></div>';
    dates.forEach(date => {
      const iso = isoDate(date);
      const head = document.createElement('div');
      head.className = `admin-day-head${iso === todayISO ? ' today' : ''}`;
      head.innerHTML = `<strong>${weekNames[(date.getDay() + 6) % 7]}</strong><small>${date.getMonth() + 1}月${date.getDate()}日</small>`;
      scheduleGrid.appendChild(head);
    });
    hours.forEach(hour => {
      const time = timeValue(hour);
      const timeLabel = document.createElement('div');
      timeLabel.className = 'admin-time';
      timeLabel.textContent = `${time}–${timeValue(hour + 1)}`;
      scheduleGrid.appendChild(timeLabel);
      dates.forEach(date => {
        const iso = isoDate(date);
        const status = scheduleMap.get(keyFor(iso, time)) || 'closed';
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `admin-slot ${status}`;
        cell.textContent = slotStatusLabel(status);
        cell.dataset.date = iso;
        cell.dataset.time = time;
        cell.disabled = iso < todayISO || status === 'pending' || status === 'booked';
        cell.title = `${displayDate(iso)} ${time} · ${slotStatusLabel(status)}`;
        if (!cell.disabled) cell.addEventListener('click', () => toggleSlot(iso, time, status));
        scheduleGrid.appendChild(cell);
      });
    });
    if (weekTitle) weekTitle.textContent = `第 ${scheduleWeek + 1} 周 · ${displayDate(isoDate(dates[0]))}–${displayDate(isoDate(dates[6]))}`;
    if (prevWeek) prevWeek.disabled = scheduleWeek === 0;
    if (nextWeek) nextWeek.disabled = scheduleWeek === 2;
  }

  async function toggleSlot(date, time, currentStatus) {
    const nextStatus = currentStatus === 'available' ? 'blocked' : 'available';
    const { error } = await db.rpc('admin_set_slot', { p_slot_date: date, p_slot_time: time, p_status: nextStatus });
    if (error) { setMessage(scheduleMessage, error.message.includes('pending') ? '审核中或已确认的时间不能修改。' : '时间状态修改失败。'); return; }
    scheduleMap.set(keyFor(date, time), nextStatus);
    renderSchedule();
    toast(nextStatus === 'available' ? '时间已开放' : '时间已关闭');
  }

  async function setManySlots(dates) {
    const slots = [];
    dates.forEach(date => hours.forEach(hour => {
      const time = timeValue(hour);
      const status = scheduleMap.get(keyFor(date, time)) || 'closed';
      if (date >= todayISO && status !== 'pending' && status !== 'booked') slots.push({ slot_date: date, slot_time: time });
    }));
    if (!slots.length) { toast('没有可以批量开放的时间'); return; }
    const { error } = await db.rpc('admin_set_slots', { p_slots: slots, p_status: 'available' });
    if (error) { setMessage(scheduleMessage, '批量开放失败，请刷新后重试。'); return; }
    await loadSchedule();
    toast(`已开放 ${slots.length} 个小时`);
  }

  function groupSlots(rows) {
    const map = new Map();
    (rows || []).forEach(row => { if (!map.has(row.request_id)) map.set(row.request_id, []); map.get(row.request_id).push(row); });
    return map;
  }

  function sessionSummary(slots) {
    const grouped = new Map();
    (slots || []).forEach(slot => { if (!grouped.has(slot.slot_date)) grouped.set(slot.slot_date, []); grouped.get(slot.slot_date).push(String(slot.slot_time).slice(0, 5)); });
    return [...grouped.keys()].sort().map(date => {
      const times = grouped.get(date).sort();
      const end = `${pad(Number(times[times.length - 1].slice(0, 2)) + 1)}:00`;
      return { date, label: displayDate(date), start: times[0], end, hours: times.length };
    });
  }

  async function loadBookings() {
    if (!db) return;
    const [requestResult, slotResult] = await Promise.all([
      db.from('booking_requests').select('*').order('created_at', { ascending: false }),
      db.from('booking_request_slots').select('*')
    ]);
    if (requestResult.error || slotResult.error) { setMessage(bookingMessage, '读取预约记录失败，请确认管理员权限和数据库策略。'); return; }
    const slotGroups = groupSlots(slotResult.data || []);
    allBookings = (requestResult.data || []).map(request => ({ ...request, sessions: sessionSummary(slotGroups.get(request.id) || []) }));
    renderBookings();
    if (dataStatus) dataStatus.textContent = `数据库已连接 · 共 ${allBookings.length} 条记录`;
  }

  function filteredBookings() {
    const start = $('#filterStart')?.value || '';
    const end = $('#filterEnd')?.value || '';
    const grade = $('#filterGrade')?.value || '';
    const subject = $('#filterSubject')?.value || '';
    const status = $('#filterStatus')?.value || '';
    const gender = $('#filterGender')?.value || '';
    const district = $('#filterDistrict')?.value || '';
    return allBookings.filter(row => {
      const dates = row.sessions.map(session => session.date);
      const inDateRange = dates.some(date => (!start || date >= start) && (!end || date <= end));
      return inDateRange && (!grade || row.grade === grade) && (!subject || row.subject === subject) && (!status || row.status === status) && (!gender || row.gender === gender) && (!district || row.district === district);
    });
  }

  function locationHtml(row) {
    if (row.location_mode === 'online') return '<p><strong>线上课程</strong></p>';
    return `<p><strong>线下 · ${escapeHtml(row.district || '广州')}</strong></p><p>${escapeHtml(row.venue_type || '')}</p><p>${escapeHtml(row.address || '')}</p>`;
  }

  function renderBookings() {
    if (!bookingRows) return;
    const rows = filteredBookings();
    if (!rows.length) { bookingRows.innerHTML = '<tr><td colspan="7" class="empty-table">暂无符合条件的预约记录。</td></tr>'; return; }
    bookingRows.innerHTML = rows.map(row => {
      const sessions = row.sessions.map(session => `<p>${escapeHtml(session.label)}<br>${escapeHtml(session.start)}–${escapeHtml(session.end)}（${session.hours}小时）</p>`).join('');
      const pending = row.status === 'pending';
      const confirmed = row.status === 'confirmed';
      return `<tr><td><span class="table-status ${escapeHtml(row.status)}">${escapeHtml(statusLabel(row.status))}</span><span class="query-code">查询码：${escapeHtml(row.lookup_code)}</span></td><td><strong>${escapeHtml(row.student_name)}</strong><br>${escapeHtml(row.gender)} · ${escapeHtml(row.grade)} · ${escapeHtml(row.subject)}<br>当前：${escapeHtml(row.current_score || '')}<br>目标：${escapeHtml(row.target_score || '')}</td><td class="booking-time">${sessions}</td><td class="booking-place">${locationHtml(row)}<p>预期价格：${escapeHtml(row.expected_price || '')}</p></td><td>${escapeHtml(row.contact || '')}</td><td>${escapeHtml(row.notes || '—')}<br><small>${row.review_reason ? `处理说明：${escapeHtml(row.review_reason)}` : ''}</small></td><td><div class="table-actions"><button class="table-action confirm" data-review="confirm" data-id="${row.id}" ${pending ? '' : 'disabled'}>确认</button><button class="table-action reject" data-review="reject" data-id="${row.id}" ${pending ? '' : 'disabled'}>拒绝</button><button class="table-action" data-review="cancel" data-id="${row.id}" ${confirmed ? '' : 'disabled'}>取消预约</button></div></td></tr>`;
    }).join('');
  }

  async function reviewBooking(action, id) {
    let reason = null;
    if (action === 'reject') {
      reason = window.prompt('请输入拒绝原因（可留空，前台不会显示具体原因）：', '');
      if (reason === null) return;
    }
    if (action === 'cancel' && !window.confirm('确认取消这条已确认预约，并释放对应时间吗？')) return;
    const { error } = await db.rpc('admin_review_booking', { p_request_id: id, p_action: action, p_reason: reason });
    if (error) { setMessage(bookingMessage, error.message || '状态修改失败。'); return; }
    await Promise.all([loadBookings(), loadSchedule()]);
    toast(action === 'confirm' ? '预约已确认' : action === 'reject' ? '预约已拒绝，时间已释放' : '预约已取消，时间已释放');
  }

  function exportBookings() {
    const rows = filteredBookings().map(row => ({
      查询码: row.lookup_code,
      状态: statusLabel(row.status),
      学生姓名: row.student_name,
      性别: row.gender,
      年级: row.grade,
      科目: row.subject,
      预约时间: row.sessions.map(session => `${session.label} ${session.start}-${session.end}`).join('；'),
      课程小时数: row.sessions.reduce((sum, session) => sum + session.hours, 0),
      上课方式: row.location_mode === 'online' ? '线上' : '线下',
      地点区域: row.district || '',
      线下地点: row.venue_type || '',
      详细地址: row.address || '',
      联系方式: row.contact || '',
      当前成绩: row.current_score || '',
      目标成绩: row.target_score || '',
      预期价格: row.expected_price || '',
      学习问题与备注: row.notes || '',
      审核说明: row.review_reason || '',
      提交时间: row.created_at || '',
      处理时间: row.reviewed_at || ''
    }));
    if (!rows.length) { toast('当前筛选没有可导出的记录'); return; }
    const date = isoDate(new Date());
    if (window.XLSX) {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, '预约记录');
      XLSX.writeFile(book, `何老师预约记录-${date}.xlsx`);
      return;
    }
    const header = Object.keys(rows[0]);
    const csv = `\ufeff${[header, ...rows.map(row => header.map(key => row[key]))].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `何老师预约记录-${date}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  function setupRealtime() {
    if (!db) return;
    db.channel('admin-booking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_slots' }, () => loadSchedule())
      .subscribe();
    setInterval(loadBookings, 30000);
  }

  loginForm?.addEventListener('submit', signIn);
  $('#adminLogout')?.addEventListener('click', async () => { await db?.auth.signOut(); app.hidden = true; loginCard.hidden = false; });
  prevWeek?.addEventListener('click', () => { if (scheduleWeek > 0) { scheduleWeek -= 1; renderSchedule(); } });
  nextWeek?.addEventListener('click', () => { if (scheduleWeek < 2) { scheduleWeek += 1; renderSchedule(); } });
  $('#initSchedule')?.addEventListener('click', async () => { await initializeSchedule(); await loadSchedule(); toast('未来21天时间表已初始化'); });
  $('#openAll21')?.addEventListener('click', () => setManySlots(Array.from({ length: 21 }, (_, index) => isoDate(addDays(rangeStart, index)))));
  $('#openCurrentWeek')?.addEventListener('click', () => setManySlots(datesForWeek(scheduleWeek).map(isoDate)));
  $('#reloadBookings')?.addEventListener('click', loadBookings);
  $('#exportBookings')?.addEventListener('click', exportBookings);
  document.querySelectorAll('#bookingFilters input,#bookingFilters select').forEach(element => element.addEventListener('change', renderBookings));
  bookingRows?.addEventListener('click', event => { const button = event.target.closest('[data-review]'); if (button && !button.disabled) reviewBooking(button.dataset.review, button.dataset.id); });

  if (!canConnect) {
    setMessage(loginMessage, '当前网站尚未配置 Supabase。请填写 js/config.js，并执行 supabase-schema.sql。');
  } else {
    db.auth.getSession().then(({ data }) => { if (data?.session) showApp(); });
  }
})();
