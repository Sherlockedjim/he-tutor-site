(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const config = window.HE_TUTOR_CONFIG || {};
  const hasSupabase = Boolean(config.USE_SUPABASE && config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase?.createClient);
  const db = hasSupabase ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;
  const grid = $('#bookingGrid');
  const weekTitle = $('#bookingWeekTitle');
  const prevWeek = $('#prevWeek');
  const nextWeek = $('#nextWeek');
  const summary = $('#selectionSummary');
  const selectedSessions = $('#selectedSessions');
  const resetButton = $('#resetSelection');
  const form = $('#bookingFormV2');
  const formStatus = $('#formStatusV2');
  const locationMode = $('#locationMode');
  const offlineFields = $('#offlineFields');
  const district = $('#district');
  const venueType = $('#venueType');
  const addressField = $('#addressField');
  const lookupForm = $('#lookupForm');
  const lookupCode = $('#lookupCode');
  const lookupResult = $('#lookupResult');
  const weekNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const hours = Array.from({ length: 13 }, (_, index) => 9 + index);
  const selected = new Map();
  const slotMap = new Map();
  let weekIndex = 0;
  let toastTimer;

  const pad = value => String(value).padStart(2, '0');
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeValue = hour => `${pad(hour)}:00`;
  const fromISO = value => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const addDays = (date, count) => {
    const result = new Date(date);
    result.setDate(result.getDate() + count);
    return result;
  };
  const getMonday = date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
    return result;
  };
  const rangeStart = getMonday(new Date());
  const rangeEnd = addDays(rangeStart, 20);
  const todayISO = isoDate(new Date());
  const displayDate = iso => {
    const date = fromISO(iso);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekNames[(date.getDay() + 6) % 7]}`;
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const showToast = message => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  };
  const keyFor = (date, time) => `${date}|${time}`;
  const dateListForWeek = index => Array.from({ length: 7 }, (_, offset) => addDays(rangeStart, index * 7 + offset));
  const selectedTimes = date => [...(selected.get(date) || [])].sort();
  const timeIsContiguous = times => {
    const values = times.map(value => Number(value.slice(0, 2))).sort((a, b) => a - b);
    return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
  };
  const dateSelectionIsValid = date => {
    const times = selectedTimes(date);
    return times.length >= 2 && times.length <= 3 && timeIsContiguous(times);
  };
  const allSelectionsValid = () => selected.size > 0 && [...selected.keys()].every(dateSelectionIsValid);
  const statusLabel = status => ({ available: '可预约', pending: '审核中', booked: '已预约', blocked: '已预约', closed: '暂未开放', past: '已过期' }[status] || '暂不可选');

  function setFormStatus(message, type = '') {
    if (!formStatus) return;
    formStatus.className = `form-status-v2${type ? ` ${type}` : ''}`;
    formStatus.textContent = message;
  }

  function renderSelectionSummary() {
    if (!summary || !selectedSessions) return;
    if (!selected.size) {
      summary.innerHTML = '<span>尚未选择时间</span>';
      selectedSessions.innerHTML = '<span>请先在左侧选择上课时间</span>';
      return;
    }
    const rows = [...selected.keys()].sort().map(date => {
      const times = selectedTimes(date);
      const start = times[0]?.slice(0, 5) || '';
      const end = times.length ? `${pad(Number(times[times.length - 1].slice(0, 2)) + 1)}:00` : '';
      const valid = dateSelectionIsValid(date);
      return `<p class="${valid ? '' : 'selection-warning'}"><strong>${escapeHtml(displayDate(date))}</strong> · ${start && end ? `${start}–${end}` : '请选择连续时间'}（${times.length} 小时）${valid ? '' : ' · 每天必须连续选择 2–3 小时'}</p>`;
    }).join('');
    const total = [...selected.values()].reduce((sum, times) => sum + times.size, 0);
    summary.innerHTML = `<strong>已选择 ${selected.size} 天，共 ${total} 小时</strong>${rows}`;
    selectedSessions.innerHTML = `<strong>已选择 ${selected.size} 个上课日期</strong>${rows}`;
  }

  function renderGrid() {
    if (!grid) return;
    const dates = dateListForWeek(weekIndex);
    grid.innerHTML = '<div class="schedule-corner" aria-hidden="true"></div>';
    dates.forEach(date => {
      const iso = isoDate(date);
      const header = document.createElement('div');
      header.className = `schedule-day-head${iso === todayISO ? ' today' : ''}${iso < todayISO ? ' past' : ''}`;
      header.innerHTML = `<strong>${weekNames[(date.getDay() + 6) % 7]}</strong><small>${date.getMonth() + 1}月${date.getDate()}日</small>`;
      grid.appendChild(header);
    });
    hours.forEach(hour => {
      const time = timeValue(hour);
      const label = document.createElement('div');
      label.className = 'schedule-time';
      label.textContent = `${time}–${timeValue(hour + 1)}`;
      grid.appendChild(label);
      dates.forEach(date => {
        const iso = isoDate(date);
        const past = iso < todayISO;
        const remoteStatus = slotMap.get(keyFor(iso, time)) || 'closed';
        const status = past ? 'past' : remoteStatus;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `schedule-cell ${status}${selected.get(iso)?.has(time) ? ' selected' : ''}`;
        cell.dataset.date = iso;
        cell.dataset.time = time;
        cell.disabled = status !== 'available';
        cell.setAttribute('aria-label', `${displayDate(iso)} ${time} ${statusLabel(status)}`);
        cell.innerHTML = `<span class="cell-label">${selected.get(iso)?.has(time) ? '已选择' : statusLabel(status)}</span>`;
        if (status === 'available') cell.addEventListener('click', () => toggleTime(iso, time));
        grid.appendChild(cell);
      });
    });
    if (weekTitle) weekTitle.textContent = `第 ${weekIndex + 1} 周 · ${displayDate(isoDate(dates[0]))}–${displayDate(isoDate(dates[6]))}`;
    if (prevWeek) prevWeek.disabled = weekIndex === 0;
    if (nextWeek) nextWeek.disabled = weekIndex === 2;
    renderSelectionSummary();
  }

  function toggleTime(date, time) {
    const times = selectedTimes(date);
    if (!times.length) {
      selected.set(date, new Set([time]));
    } else if (times.includes(time)) {
      const next = new Set(times.filter(value => value !== time));
      if (next.size) selected.set(date, next); else selected.delete(date);
    } else {
      if (times.length >= 3) {
        showToast('每天最多选择 3 个连续时间片');
        return;
      }
      const candidate = [...times, time].sort();
      if (!timeIsContiguous(candidate)) {
        showToast('同一天请选择连续的时间片');
        return;
      }
      selected.set(date, new Set(candidate));
    }
    renderGrid();
  }

  function resetSelection() {
    selected.clear();
    setFormStatus('');
    renderGrid();
  }

  async function loadSlots() {
    slotMap.clear();
    if (!db) {
      renderGrid();
      return;
    }
    const { data, error } = await db.from('booking_slots').select('slot_date,slot_time,status').gte('slot_date', isoDate(rangeStart)).lte('slot_date', isoDate(rangeEnd));
    if (error) {
      console.warn('预约时间读取失败', error);
      setFormStatus('预约时间暂时无法读取，请稍后刷新页面。', 'error');
    } else {
      (data || []).forEach(row => slotMap.set(keyFor(row.slot_date, String(row.slot_time).slice(0, 5)), row.status));
    }
    renderGrid();
  }

  function updateLocationFields() {
    const isOffline = locationMode?.value === 'offline';
    if (offlineFields) offlineFields.hidden = !isOffline;
    [district, venueType].forEach(field => { if (field) field.required = isOffline; });
    if (addressField) addressField.required = isOffline && venueType?.value !== '中山大学南校园周边星巴克';
    if (!isOffline) {
      if (district) district.value = '';
      if (venueType) venueType.value = '';
      if (addressField) addressField.value = '';
    }
  }

  function buildSelections() {
    return [...selected.keys()].sort().map(date => ({ slot_date: date, slot_times: selectedTimes(date) }));
  }

  function renderSubmissionResult(result) {
    const code = result?.lookup_code || result?.code || '';
    setFormStatus('', 'success');
    formStatus.innerHTML = `预约已提交，当前状态为“审核中”。<div class="lookup-code-result"><span>您的查询码：<strong>${escapeHtml(code)}</strong></span><button type="button" id="copyLookupCode">复制查询码</button></div><small>请保存查询码，之后可以在下方查询预约状态。</small>`;
    $('#copyLookupCode')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(code); showToast('查询码已复制'); } catch { showToast('请手动保存查询码'); }
    });
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!allSelectionsValid()) {
      setFormStatus(selected.size ? '每个日期都必须连续选择 2–3 个小时。' : '请先选择至少一个上课日期，每天连续选择 2–3 个小时。', 'error');
      document.querySelector('.schedule-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!db) { setFormStatus('预约系统尚未连接数据库，请先完成 Supabase 配置。', 'error'); return; }
    const formData = Object.fromEntries(new FormData(form).entries());
    delete formData.consent;
    formData.selections = buildSelections();
    const button = $('.submit-btn-v2', form);
    button.disabled = true;
    button.classList.add('loading');
    setFormStatus('正在提交，请稍候……');
    const { data, error } = await db.rpc('submit_booking_request', { p_payload: formData });
    if (error) {
      console.error(error);
      setFormStatus(/slot|available|占用|预约/i.test(error.message) ? '刚刚有其他家长占用了部分时间，请重新选择。' : '提交失败，请稍后再试或直接微信联系。', 'error');
      await loadSlots();
    } else {
      renderSubmissionResult(Array.isArray(data) ? data[0] : (data || {}));
      showToast('预约信息已提交');
      selected.clear();
      form.reset();
      updateLocationFields();
      renderGrid();
      await loadSlots();
    }
    button.disabled = false;
    button.classList.remove('loading');
  }

  function renderLookup(data) {
    if (!lookupResult) return;
    if (!data) {
      lookupResult.className = 'lookup-result error';
      lookupResult.textContent = '没有找到对应的查询码，请确认输入的是提交预约后获得的 8 位数字。';
      return;
    }
    const sessions = (data.sessions || []).map(session => `<p><strong>${escapeHtml(session.date_label || session.slot_date)}</strong> · ${escapeHtml(session.start_time)}–${escapeHtml(session.end_time)}</p>`).join('');
    lookupResult.className = 'lookup-result success';
    const contactTip = data.status === 'rejected' ? '<p class="lookup-contact-tip">如需了解具体详情，可以添加微信咨询。</p>' : '';
    lookupResult.innerHTML = `<dl><div><dt>学生</dt><dd>${escapeHtml(data.student_name)}</dd></div><div><dt>年级</dt><dd>${escapeHtml(data.grade)}</dd></div><div><dt>科目</dt><dd>${escapeHtml(data.subject)}</dd></div><div><dt>当前状态</dt><dd>${escapeHtml(data.status_label || data.status)}</dd></div></dl><div class="lookup-sessions"><span>预约时间</span>${sessions}</div>${contactTip}`;
  }

  async function lookupBooking(event) {
    event.preventDefault();
    const code = lookupCode?.value.trim() || '';
    if (!/^\d{8}$/.test(code)) {
      if (lookupResult) { lookupResult.className = 'lookup-result error'; lookupResult.textContent = '请输入 8 位数字查询码。'; }
      return;
    }
    if (!db) {
      if (lookupResult) { lookupResult.className = 'lookup-result error'; lookupResult.textContent = '查询系统尚未连接数据库，请稍后再试。'; }
      return;
    }
    if (lookupResult) { lookupResult.className = 'lookup-result'; lookupResult.textContent = '正在查询……'; }
    const { data, error } = await db.rpc('lookup_booking', { p_lookup_code: code });
    if (error) {
      if (lookupResult) { lookupResult.className = 'lookup-result error'; lookupResult.textContent = '查询失败，请稍后再试。'; }
      return;
    }
    renderLookup(Array.isArray(data) ? data[0] : data);
  }

  function setupRealtime() {
    if (!db) return;
    db.channel('public-booking-slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_slots' }, () => loadSlots())
      .subscribe();
    setInterval(loadSlots, 20000);
  }

  prevWeek?.addEventListener('click', () => { if (weekIndex > 0) { weekIndex -= 1; renderGrid(); } });
  nextWeek?.addEventListener('click', () => { if (weekIndex < 2) { weekIndex += 1; renderGrid(); } });
  resetButton?.addEventListener('click', resetSelection);
  locationMode?.addEventListener('change', updateLocationFields);
  venueType?.addEventListener('change', updateLocationFields);
  form?.addEventListener('submit', submitBooking);
  lookupForm?.addEventListener('submit', lookupBooking);
  updateLocationFields();
  renderGrid();
  loadSlots();
  setupRealtime();
})();
