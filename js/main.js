(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, config=window.HE_TUTOR_CONFIG||{};
const header=$('.site-header'), progress=$('.page-progress span'), navLinks=$$('.nav-links a'), sections=$$('main section[id]');
function updateScroll(){const y=scrollY;header?.classList.toggle('scrolled',y>30);const max=document.documentElement.scrollHeight-innerHeight;if(progress)progress.style.width=`${max?(y/max)*100:0}%`;let active='';sections.forEach(s=>{if(y>=s.offsetTop-150)active=s.id});navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${active}`))}updateScroll();addEventListener('scroll',updateScroll,{passive:true});
const navToggle=$('.nav-toggle'),nav=$('.nav-links');navToggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');navToggle.setAttribute('aria-expanded',String(open))});navLinks.forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');navToggle?.setAttribute('aria-expanded','false')}));
const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in-view'),reduced?0:Number(e.target.dataset.delay||0));ro.unobserve(e.target)}}),{threshold:.12});$$('.reveal').forEach(e=>ro.observe(e));
function animateCount(el){const t=Number(el.dataset.count||0),s=el.dataset.suffix||'';if(reduced){el.textContent=`${t}${s}`;return}const st=performance.now(),dur=1100;function step(n){const p=Math.min(1,(n-st)/dur),v=1-Math.pow(1-p,3);el.textContent=`${Math.round(t*v)}${s}`;if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}const co=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){animateCount(e.target);co.unobserve(e.target)}}),{threshold:.8});$$('.count').forEach(e=>co.observe(e));
$$('.subject-tab').forEach(tab=>tab.addEventListener('click',()=>{$$('.subject-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false')});$$('.subject-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');tab.setAttribute('aria-selected','true');$(`[data-panel="${tab.dataset.subject}"]`)?.classList.add('active')}));
$$('.method-more').forEach(btn=>btn.addEventListener('click',()=>{const c=btn.closest('.method-card');c.classList.toggle('open');btn.firstChild.textContent=c.classList.contains('open')?'收起方法 ':'展开方法 '}));
$$('[data-case-filter]').forEach(btn=>btn.addEventListener('click',()=>{$$('[data-case-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.caseFilter;$$('[data-case-subject]').forEach(card=>card.classList.toggle('hidden',f!=='all'&&card.dataset.caseSubject!==f))}));
if(!reduced&&matchMedia('(pointer:fine)').matches){const glow=$('.cursor-glow');addEventListener('pointermove',e=>{if(glow){glow.style.left=`${e.clientX}px`;glow.style.top=`${e.clientY}px`}},{passive:true});$$('[data-tilt]').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateY(-2px)`});card.addEventListener('pointerleave',()=>card.style.transform='')});$$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.08}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}
const modal=$('#qrModal'),openModal=()=>{modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')},closeModal=()=>{modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')};$$('[data-open-qr]').forEach(e=>e.addEventListener('click',openModal));$$('[data-close-qr]').forEach(e=>e.addEventListener('click',closeModal));addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
$('#backToTop')?.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,left:0,behavior:reduced?'auto':'smooth'})});
let toastTimer;function toast(msg){const e=$('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2600)}

const feedbacks=[
['熙熙妈妈','初二·数学','102→128','以前孩子遇到综合题就想跳过，现在会先画条件、再判断模型，做题明显更有条理。'],
['梓恒爸爸','高一·数学','88→112','最满意的是老师不急着给答案，会让孩子自己说出卡点，最近月考中档题稳定了很多。'],
['乐乐妈妈','初三·数学','92→118','错题不再只是抄答案，而是按原因分类。孩子第一次主动说“这题和上周那题其实是一类”。'],
['子墨爸爸','高二·数学','105→126','圆锥曲线以前完全靠运气，现在知道先找量、再定关系，步骤比以前清晰很多。'],
['可可妈妈','高三·数学','118→132','冲刺阶段最明显的是稳定性，简单题失误少了，选填压轴也敢做了。'],
['昊然爸爸','初二·数学','96→124','孩子原来计算习惯比较乱，老师把草稿和步骤都规范后，低级错误少了很多。'],
['安安妈妈','初一·数学','84→109','老师很耐心，不会因为基础弱就催。孩子现在愿意自己复盘当天的错题。'],
['嘉佑爸爸','高一·数学','101→121','函数部分从“公式很多”变成一张结构图，复习效率高了不少。'],
['朵朵妈妈','初三·数学','108→131','压轴题不是硬讲技巧，而是先把前面几个关键结论串起来，孩子接受得很好。'],
['景行爸爸','高二·数学','98→122','导数以前一看到参数就怕，现在会先拆讨论区间，思路稳定很多。'],
['予希妈妈','初二·数学','111→133','孩子本来成绩不差，但经常卡在最后两题。专项训练后思路拓宽了。'],
['睿睿爸爸','高三·数学','109→129','最有帮助的是限时训练和检查清单，考试最后十分钟不会再乱。'],
['米粒妈妈','初一·数学','79→103','老师把知识点讲得很有画面感，孩子终于不再觉得数学全是死公式。'],
['浩宇爸爸','高二·数学','114→134','每次课后都有清晰的下一步任务，复习比较聚焦，不再到处刷题。'],
['心怡妈妈','初三·数学','95→119','几何辅助线以前全靠猜，现在开始知道为什么要这样添线。'],
['泽宇爸爸','高一·数学','87→115','阶段性梳理后，集合函数和不等式之间的联系清楚了，孩子信心提升很明显。'],
['辰辰妈妈','高三·数学','121→136','高分段最怕波动，老师主要抓错因和节奏，最近几次模拟都比较稳。'],
['思思爸爸','初二·数学','103→126','老师会追问“为什么”，孩子现在讲题比以前有逻辑，学校老师也说表达更好了。'],
['奕辰妈妈','高二·数学','90→116','数列专题做完后，孩子说第一次知道同一道题为什么会有不同入口。'],
['念念爸爸','初三·数学','100→125','基础题速度提升后，终于有时间做后面的综合题，整体分数上来了。'],
['语桐妈妈','初一·数学','91→113','课堂氛围比较轻松，孩子敢问问题，回家也愿意把不会的题标出来。'],
['天佑爸爸','高一·数学','106→128','老师总结的题型识别表很实用，考试时能更快决定从哪里下手。'],
['果果妈妈','初二·数学','89→117','之前补课很多但效果一般，这次最大的变化是孩子知道该怎么复习了。'],
['子涵爸爸','高三·数学','113→131','导数和选填压轴进步明显，尤其是不会再在一道题上死磕太久。'],
['沐沐妈妈','初三·数学','104→129','老师会把同类错题串起来讲，孩子觉得“题少了”，其实是方法更系统了。'],
['晴晴妈妈','初一·英语','86→108','词汇不再每天机械抄十遍，改成短周期反复提取后，单词保持得更久。'],
['宇轩爸爸','初二·英语','97→121','阅读最明显，孩子学会先看段落结构再做题，不会每句都翻译。'],
['佳宁妈妈','初三·英语','104→126','语法错题按类型整理后，孩子自己能发现是时态还是从句的问题。'],
['晨曦爸爸','高一·英语','92→117','长难句拆分方法很实用，阅读速度比之前快了不少。'],
['悦悦妈妈','高二·英语','108→130','写作从“想到哪写到哪”变成先搭结构，再补句子，分数稳定很多。'],
['一诺爸爸','高三·英语','101→124','冲刺阶段主要练阅读顺序和时间分配，孩子说考场没以前慌了。'],
['糖糖妈妈','初二·英语','83→109','孩子原来怕开口，老师会先让她用简单句表达，再慢慢升级，接受度很好。'],
['承泽爸爸','初三·英语','95→120','完形和阅读不再只凭语感，开始会找逻辑关系和上下文证据。'],
['小满妈妈','高一·英语','99→122','背单词终于不是背了忘忘了背，间隔复习之后效率高很多。'],
['思远爸爸','高二·英语','112→132','老师对作文修改很细，但不是直接重写，而是让孩子自己判断问题。'],
['依依妈妈','初一·英语','88→111','基础语法补齐后，孩子学校作业速度快了，抵触情绪也少了。'],
['嘉禾爸爸','高三·英语','106→127','最后两个月重点抓阅读和作文，提分不夸张但非常稳定。'],
['团团妈妈','初二·英语','91→116','每周都会回看上周学过的词和句型，孩子现在记忆比以前扎实。'],
['皓皓爸爸','高一·英语','94→119','老师把语法规则变成几个判断步骤，孩子做单选和语法填空更有把握。'],
['桃子妈妈','初三·英语','99→123','孩子以前一篇阅读错三四个，现在多数能控制在一两个，信心提升很多。'],
['景川爸爸','高二·英语','103→126','重点不是刷多少篇，而是复盘为什么选错，这个方法对孩子很有效。'],
['星星妈妈','初一·英语','82→106','老师很温和，孩子基础弱也不会有压力，现在愿意主动读英文。'],
['梓萱爸爸','高三·英语','110→131','考前模拟会严格计时，帮助很大，正式考试时节奏明显更稳。'],
['豆豆妈妈','初二·英语','90→114','写作从很多中式表达变得更自然，孩子也知道怎么自己检查。'],
['柏宇爸爸','高一·英语','97→120','阅读先定位再验证的方法很实用，尤其是细节题进步明显。'],
['宁宁妈妈','初三·英语','102→125','老师会用思维导图串语法，孩子觉得以前散着的知识终于连起来了。'],
['彦泽爸爸','高二·英语','109→129','词汇、长难句、写作三个部分都有固定复盘模板，执行起来很清楚。'],
['夏夏妈妈','初一·英语','85→110','孩子从不愿背单词到会自己做小测，学习主动性是最惊喜的变化。'],
['朗朗爸爸','高三·英语','104→126','阅读理解的定位速度上来后，给作文留的时间更充足了。'],
['念初妈妈','初二·英语','93→118','课堂会让孩子主动复述刚学的内容，回家后记得更牢。'],
['嘉树爸爸','高一·英语','100→124','老师会告诉孩子哪些错误值得重点改，不会平均用力，效率高很多。'],
['禾禾妈妈','初三·英语','98→122','孩子现在做错题会写“我为什么会选这个”，思考比以前深入了。'],
['书言爸爸','高二·英语','105→128','阶段测试之后会调整计划，不是一直按固定进度走，这点我们很认可。']
];
function cardHtml(f){const [name,meta,gain,text]=f;return `<article class="feedback-card"><div class="feedback-meta"><div class="feedback-parent"><span class="feedback-avatar">${name.slice(0,1)}</span><div><strong>${name}</strong><small>${meta}</small></div></div><span class="feedback-gain">${gain}</span></div><p>“${text}”</p><span class="feedback-label">家长反馈 · 展示示例</span></article>`}
function renderFeedback(){const a=feedbacks.slice(0,25),b=feedbacks.slice(25);const A=$('#feedbackTrackA'),B=$('#feedbackTrackB');if(A)A.innerHTML=[...a,...a].map(cardHtml).join('');if(B)B.innerHTML=[...b,...b].map(cardHtml).join('')}renderFeedback();

const dateScroller=$('#dateScroller'),slotsEl=$('#timeSlots'),dateLabel=$('#selectedDateLabel'),slotDateInput=$('#slotDate'),slotTimeInput=$('#slotTime'),slotCard=$('#selectedSlotCard');let selectedDate='',selectedTime='',remoteSlots=[];
const pad=n=>String(n).padStart(2,'0'),fmtISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,cnWeek=['周日','周一','周二','周三','周四','周五','周六'];const displayDate=iso=>{const [y,m,d]=iso.split('-').map(Number),dt=new Date(y,m-1,d);return `${m}月${d}日 ${cnWeek[dt.getDay()]}`};const recurring={0:['09:30','14:00','16:00','19:00'],1:['19:00','20:30'],2:['19:00','20:30'],3:['19:00','20:30'],4:['19:00','20:30'],5:['19:00','20:30'],6:['09:30','14:00','16:00','19:00']};const localKey='he_tutor_bookings_v1',localBookings=()=>JSON.parse(localStorage.getItem(localKey)||'[]'),isPresetBusy=(iso,time)=>(Number(iso.replaceAll('-',''))+Number(time.replace(':','')))%5===0,isLocalBooked=(iso,time)=>localBookings().some(x=>x.slot_date===iso&&x.slot_time===time),hasSupabase=()=>Boolean(config.USE_SUPABASE&&config.SUPABASE_URL&&config.SUPABASE_ANON_KEY);
async function supabaseFetch(path,options={}){const url=`${config.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${path}`,headers={apikey:config.SUPABASE_ANON_KEY,Authorization:`Bearer ${config.SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...options.headers},res=await fetch(url,{...options,headers});if(!res.ok)throw new Error((await res.text())||`HTTP ${res.status}`);return(res.headers.get('content-type')||'').includes('application/json')?res.json():null}
async function loadRemoteSlots(){if(!hasSupabase())return;const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+21);const q=`booking_slots?select=id,slot_date,slot_time,status&slot_date=gte.${fmtISO(start)}&slot_date=lte.${fmtISO(end)}&order=slot_date.asc,slot_time.asc`;try{remoteSlots=await supabaseFetch(q)}catch(e){console.warn('Remote slots unavailable',e);remoteSlots=[]}}
function renderDates(){if(!dateScroller)return;dateScroller.innerHTML='';const today=new Date();today.setHours(0,0,0,0);for(let i=0;i<21;i++){const d=new Date(today);d.setDate(today.getDate()+i);const iso=fmtISO(d),btn=document.createElement('button');btn.type='button';btn.className='date-btn';btn.dataset.date=iso;btn.innerHTML=`<small>${d.getMonth()+1}月</small><strong>${d.getDate()}</strong><span>${cnWeek[d.getDay()]}</span>`;btn.addEventListener('click',()=>selectDate(iso,btn));dateScroller.appendChild(btn)}}
function slotsForDate(iso){if(hasSupabase()&&remoteSlots.length)return remoteSlots.filter(s=>s.slot_date===iso).map(s=>({time:String(s.slot_time).slice(0,5),booked:s.status!=='available'}));const[y,m,d]=iso.split('-').map(Number),dt=new Date(y,m-1,d);return(recurring[dt.getDay()]||[]).map(time=>({time,booked:isPresetBusy(iso,time)||isLocalBooked(iso,time)}))}
function selectDate(iso,btn){selectedDate=iso;selectedTime='';$$('.date-btn').forEach(b=>b.classList.toggle('active',b===btn));if(dateLabel)dateLabel.textContent=displayDate(iso);if(slotDateInput)slotDateInput.value=iso;if(slotTimeInput)slotTimeInput.value='';updateSelectedSlotCard();renderSlots()}
function renderSlots(){if(!slotsEl)return;slotsEl.innerHTML='';const list=slotsForDate(selectedDate);if(!list.length){slotsEl.innerHTML='<div class="empty-slots">当天暂未开放预约时段</div>';return}list.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='time-btn';b.disabled=item.booked;b.textContent=item.booked?`${item.time} 已约满`:item.time;if(selectedTime===item.time)b.classList.add('active');b.addEventListener('click',()=>{selectedTime=item.time;if(slotTimeInput)slotTimeInput.value=item.time;$$('.time-btn').forEach(x=>x.classList.toggle('active',x===b));updateSelectedSlotCard()});slotsEl.appendChild(b)})}
function updateSelectedSlotCard(){if(!slotCard)return;if(selectedDate&&selectedTime){slotCard.classList.add('ready');slotCard.innerHTML=`<strong>${displayDate(selectedDate)}</strong> · ${selectedTime} <small>（广州时间）</small>`}else{slotCard.classList.remove('ready');slotCard.innerHTML='<span>尚未选择预约时间</span>'}}
async function submitRemote(p){return supabaseFetch('rpc/book_tutor_slot',{method:'POST',body:JSON.stringify({p_slot_date:p.slot_date,p_slot_time:p.slot_time,p_student_name:p.student_name,p_grade:p.grade,p_subject:p.subject,p_current_score:p.current_score,p_target_score:p.target_score,p_contact:p.contact,p_notes:p.notes||null})})}function submitLocal(p){const arr=localBookings();if(arr.some(x=>x.slot_date===p.slot_date&&x.slot_time===p.slot_time))throw new Error('该时间刚刚已被预约，请选择其他时段。');arr.push({...p,created_at:new Date().toISOString()});localStorage.setItem(localKey,JSON.stringify(arr))}
const form=$('#bookingForm');form?.addEventListener('submit',async e=>{e.preventDefault();const status=$('#formStatus'),submit=$('.submit-btn',form);status.className='form-status';status.textContent='';if(!selectedDate||!selectedTime){status.classList.add('error');status.textContent='请先选择预约日期和时间。';$('.calendar-card')?.scrollIntoView({behavior:'smooth',block:'center'});return}if(!form.checkValidity()){form.reportValidity();return}const fd=new FormData(form),payload=Object.fromEntries(fd.entries());delete payload.consent;submit.disabled=true;submit.classList.add('loading');try{if(hasSupabase())await submitRemote(payload);else submitLocal(payload);status.classList.add('success');status.textContent=hasSupabase()?'预约已提交，我们会尽快与您确认。':'演示预约已保存到本机；接入数据库后即可实时同步。';toast('预约信息已提交');renderSlots();form.reset();selectedTime='';if(slotTimeInput)slotTimeInput.value='';updateSelectedSlotCard();setTimeout(openModal,700)}catch(err){console.error(err);status.classList.add('error');status.textContent=/slot|预约|available|booked/i.test(err.message)?'该时段可能已被预约，请刷新后选择其他时间。':'提交失败，请稍后再试或直接微信联系。'}finally{submit.disabled=false;submit.classList.remove('loading')}});
(async()=>{await loadRemoteSlots();renderDates();$('.date-btn')?.click()})();
})();
