(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const config = window.HE_TUTOR_CONFIG || {};

  // Header / progress / active nav
  const header = $('.site-header');
  const progress = $('.page-progress span');
  const navLinks = $$('.nav-links a');
  const sections = $$('main section[id]');
  const updateScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('scrolled', y > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max ? (y / max) * 100 : 0}%`;
    let active = '';
    sections.forEach(sec => { if (y >= sec.offsetTop - 150) active = sec.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${active}`));
  };
  updateScroll();
  addEventListener('scroll', updateScroll, { passive: true });

  // Mobile nav
  const navToggle = $('.nav-toggle');
  const nav = $('.nav-links');
  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach(a => a.addEventListener('click', () => {
    nav?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Reveal animations
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = Number(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('in-view'), reducedMotion ? 0 : delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  // Counter animation
  const animateCount = el => {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion) { el.textContent = `${target}${suffix}`; return; }
    const start = performance.now(), duration = 1100;
    const step = now => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); countObserver.unobserve(e.target); } });
  }, { threshold: .8 });
  $$('.count').forEach(el => countObserver.observe(el));

  // Subject tabs
  $$('.subject-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.subject-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    $$('.subject-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    $(`[data-panel="${tab.dataset.subject}"]`)?.classList.add('active');
  }));

  // Expand teaching method cards
  $$('.method-more').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.method-card');
    card.classList.toggle('open');
    btn.firstChild.textContent = card.classList.contains('open') ? '收起方法 ' : '展开方法 ';
  }));

  // Premium pointer interactions: glow + gentle tilt + magnetic buttons
  if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
    const glow = $('.cursor-glow');
    addEventListener('pointermove', e => {
      if (glow) { glow.style.left = `${e.clientX}px`; glow.style.top = `${e.clientY}px`; }
    }, { passive:true });

    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(900px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform = '');
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width/2)) * .08;
        const y = (e.clientY - (r.top + r.height/2)) * .08;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
  }

  // QR modal
  const modal = $('#qrModal');
  const openModal = () => { modal?.classList.add('open'); modal?.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); };
  const closeModal = () => { modal?.classList.remove('open'); modal?.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); };
  $$('[data-open-qr]').forEach(el => el.addEventListener('click', openModal));
  $$('[data-close-qr]').forEach(el => el.addEventListener('click', closeModal));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Toast
  let toastTimer;
  const toast = msg => {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };

  // Booking: 21-day rolling calendar. In static demo, some slots are preset busy + local bookings.
  const dateScroller = $('#dateScroller');
  const slotsEl = $('#timeSlots');
  const dateLabel = $('#selectedDateLabel');
  const slotDateInput = $('#slotDate');
  const slotTimeInput = $('#slotTime');
  const slotCard = $('#selectedSlotCard');
  let selectedDate = '';
  let selectedTime = '';
  let remoteSlots = [];

  const pad = n => String(n).padStart(2, '0');
  const fmtISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cnWeek = ['周日','周一','周二','周三','周四','周五','周六'];
  const displayDate = iso => {
    const [y,m,d] = iso.split('-').map(Number);
    const dt = new Date(y,m-1,d);
    return `${m}月${d}日 ${cnWeek[dt.getDay()]}`;
  };
  const recurring = {
    0:['09:30','14:00','16:00','19:00'],
    1:['19:00','20:30'],
    2:['19:00','20:30'],
    3:['19:00','20:30'],
    4:['19:00','20:30'],
    5:['19:00','20:30'],
    6:['09:30','14:00','16:00','19:00']
  };
  const localKey = 'he_tutor_bookings_v1';
  const localBookings = () => JSON.parse(localStorage.getItem(localKey) || '[]');
  const isPresetBusy = (iso, time) => {
    // deterministic demo busy state so the UI always demonstrates "已约满"
    const score = Number(iso.replaceAll('-','')) + Number(time.replace(':',''));
    return score % 5 === 0;
  };
  const isLocalBooked = (iso,time) => localBookings().some(x => x.slot_date === iso && x.slot_time === time);
  const hasSupabase = () => Boolean(config.USE_SUPABASE && config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  async function supabaseFetch(path, options = {}) {
    const url = `${config.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${path}`;
    const headers = {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    return type.includes('application/json') ? res.json() : null;
  }

  async function loadRemoteSlots() {
    if (!hasSupabase()) return;
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate()+21);
    const query = `booking_slots?select=id,slot_date,slot_time,status&slot_date=gte.${fmtISO(start)}&slot_date=lte.${fmtISO(end)}&order=slot_date.asc,slot_time.asc`;
    try { remoteSlots = await supabaseFetch(query); }
    catch (err) { console.warn('Remote slots unavailable, fallback to local demo.', err); remoteSlots = []; }
  }

  function renderDates() {
    if (!dateScroller) return;
    dateScroller.innerHTML = '';
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0;i<21;i++) {
      const d = new Date(today); d.setDate(today.getDate()+i);
      const iso = fmtISO(d);
      const btn = document.createElement('button'); btn.type='button'; btn.className='date-btn';
      btn.dataset.date = iso;
      btn.innerHTML = `<small>${d.getMonth()+1}月</small><strong>${d.getDate()}</strong><span>${cnWeek[d.getDay()]}</span>`;
      btn.addEventListener('click', () => selectDate(iso, btn));
      dateScroller.appendChild(btn);
    }
  }

  function slotsForDate(iso) {
    if (hasSupabase() && remoteSlots.length) return remoteSlots.filter(s => s.slot_date === iso).map(s => ({ time: String(s.slot_time).slice(0,5), booked:s.status !== 'available' }));
    const [y,m,d] = iso.split('-').map(Number); const dt = new Date(y,m-1,d);
    return (recurring[dt.getDay()] || []).map(time => ({ time, booked: isPresetBusy(iso,time) || isLocalBooked(iso,time) }));
  }

  function selectDate(iso, btn) {
    selectedDate = iso; selectedTime='';
    $$('.date-btn').forEach(b => b.classList.toggle('active', b === btn));
    if (dateLabel) dateLabel.textContent = displayDate(iso);
    if (slotDateInput) slotDateInput.value = iso;
    if (slotTimeInput) slotTimeInput.value = '';
    updateSelectedSlotCard(); renderSlots();
  }

  function renderSlots() {
    if (!slotsEl) return;
    slotsEl.innerHTML='';
    const list = slotsForDate(selectedDate);
    if (!list.length) { slotsEl.innerHTML='<div class="empty-slots">当天暂未开放预约时段</div>'; return; }
    list.forEach(item => {
      const b=document.createElement('button'); b.type='button'; b.className='time-btn'; b.disabled=item.booked; b.textContent=item.booked?`${item.time} 已约满`:item.time;
      if (selectedTime===item.time) b.classList.add('active');
      b.addEventListener('click',()=>{
        selectedTime=item.time; if(slotTimeInput)slotTimeInput.value=item.time;
        $$('.time-btn').forEach(x=>x.classList.toggle('active',x===b)); updateSelectedSlotCard();
      });
      slotsEl.appendChild(b);
    });
  }

  function updateSelectedSlotCard(){
    if(!slotCard)return;
    if(selectedDate&&selectedTime){slotCard.classList.add('ready');slotCard.innerHTML=`<strong>${displayDate(selectedDate)}</strong> · ${selectedTime} <small>（广州时间）</small>`;}
    else{slotCard.classList.remove('ready');slotCard.innerHTML='<span>尚未选择预约时间</span>';}
  }

  async function submitRemote(payload) {
    return supabaseFetch('rpc/book_tutor_slot', { method:'POST', body:JSON.stringify({
      p_slot_date: payload.slot_date,
      p_slot_time: payload.slot_time,
      p_student_name: payload.student_name,
      p_grade: payload.grade,
      p_subject: payload.subject,
      p_current_score: payload.current_score,
      p_target_score: payload.target_score,
      p_contact: payload.contact,
      p_notes: payload.notes || null
    })});
  }

  function submitLocal(payload) {
    const arr = localBookings();
    if (arr.some(x => x.slot_date===payload.slot_date && x.slot_time===payload.slot_time)) throw new Error('该时间刚刚已被预约，请选择其他时段。');
    arr.push({...payload, created_at:new Date().toISOString()});
    localStorage.setItem(localKey, JSON.stringify(arr));
  }

  const form = $('#bookingForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const status=$('#formStatus'); const submit=$('.submit-btn',form);
    status.className='form-status'; status.textContent='';
    if (!selectedDate || !selectedTime) { status.classList.add('error'); status.textContent='请先选择预约日期和时间。'; document.querySelector('.calendar-card')?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form); const payload = Object.fromEntries(fd.entries()); delete payload.consent;
    submit.disabled=true; submit.classList.add('loading');
    try {
      if (hasSupabase()) await submitRemote(payload); else submitLocal(payload);
      status.classList.add('success');
      status.textContent = hasSupabase() ? '预约已提交，我们会尽快与您确认。' : '演示预约已保存到本机；接入数据库后即可实时同步。';
      toast('预约信息已提交');
      renderSlots();
      form.reset();
      selectedTime=''; if(slotTimeInput)slotTimeInput.value=''; updateSelectedSlotCard();
      setTimeout(openModal, 700);
    } catch(err) {
      console.error(err); status.classList.add('error'); status.textContent = /slot|预约|available|booked/i.test(err.message) ? '该时段可能已被预约，请刷新后选择其他时间。' : '提交失败，请稍后再试或直接微信联系。';
    } finally { submit.disabled=false; submit.classList.remove('loading'); }
  });

  (async function initBooking(){
    await loadRemoteSlots(); renderDates();
    const first = $('.date-btn'); if(first) first.click();
  })();
})();
