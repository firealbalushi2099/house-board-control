/* Weekly counters: read-only TV; authenticated phone controls. */
'use strict';
const BehaviorView=(()=>{
 const q=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const digits=n=>Number(n||0).toLocaleString('ar-OM');
 const dateLabel=s=>new Intl.DateTimeFormat('ar-OM',{day:'numeric',month:'long',timeZone:'Asia/Muscat'}).format(new Date(s+'T12:00:00+04:00'));
 const dayLabel=s=>new Intl.DateTimeFormat('ar-OM',{weekday:'short',timeZone:'Asia/Muscat'}).format(new Date(s+'T12:00:00+04:00'));
 const period=d=>`${dateLabel(d.start_date)} — الخميس ${dateLabel(d.end_date)}`;
 const phase=d=>d.phase==='ended'?'اكتملت الفترة · السجل محفوظ':d.phase==='pending'?'لم تبدأ الفترة':'حتى نهاية الخميس';
 function days(p,d){return `<div class="counter-days">${Object.entries(p.days).map(([day,count])=>`<div class="counter-day ${day===d.today?'today':''} ${day>d.today?'future':''} ${day===d.end_date?'reward-day':''}"><span>${safe(dayLabel(day))}</span>${day===d.end_date?'<img class="counter-gift" src="./behavior-gift.webp" alt="هدية يوم الخميس"><small>موعد الهدية</small>':''}<b>${day>d.today?'—':digits(count)}</b></div>`).join('')}</div>`}
 function dial(p){return `<div class="counter-dial" aria-label="${safe(p.name)}: ${p.count} علامة"><span class="dial-hinge" aria-hidden="true"></span><strong>${digits(p.count)}</strong><small>${p.count===0?'بداية هادئة':'علامة مسجّلة'}</small></div>`}
 let phoneStamp='',displayStamp='';
 function display(d){const box=q('#counterDisplay');if(!box)return;const stamp=JSON.stringify(d);if(stamp===displayStamp)return;displayStamp=stamp;
 box.innerHTML=`<header class="counter-heading"><div><span class="counter-kicker">ننتبه ونتعلّم</span><h1>صفحة السلوك</h1></div><div class="counter-period"><b>${safe(period(d))}</b><span>${phase(d)}</span></div></header><div class="counter-pair">${Object.entries(d.people).map(([id,p])=>`<article class="counter-card ${id}"><header><span class="counter-initial">${safe(p.name[0])}</span><h2>${safe(p.name)}</h2><span class="counter-total-label">مجموع الفترة</span></header>${dial(p)}${days(p,d)}</article>`).join('')}</div><p class="counter-footnote">كل يوم فرصة جديدة · العدّاد يُحدَّث من هاتف الوالدين</p>`;
 }
 function phone(d){const box=q('#counterPhone');if(!box||!d)return;const stamp=JSON.stringify(d);if(stamp===phoneStamp)return;phoneStamp=stamp;
 const drafts={};box.querySelectorAll('input').forEach(e=>drafts[e.id]=e.value);
 box.innerHTML=`<div class="counter-phone-period"><span>الفترة الحالية</span><b>${safe(period(d))}</b><small>${phase(d)} · لا يتصفّر يوميًا</small><div class="counter-gift-appointment"><img src="./behavior-gift.webp" alt="هدية الخميس"><span>الخميس ${safe(dateLabel(d.end_date))}<b>موعد الهدية</b></span></div></div>${Object.entries(d.people).map(([id,p])=>`<article class="counter-card ${id}"><header><span class="counter-initial">${safe(p.name[0])}</span><h2>${safe(p.name)}</h2></header>${dial(p)}${days(p,d)}<details class="counter-note-wrap"><summary>سبب <span>اختياري</span></summary><label class="counter-note-label" for="counter-note-${id}">يظهر في هاتفك فقط</label><input id="counter-note-${id}" class="counter-note" maxlength="120" placeholder="اكتبي السبب…" ${d.active?'':'disabled'}></details><button class="counter-add" type="button" data-counter-action="add" data-counter-person="${id}" ${d.active?'':'disabled'} aria-label="تسجيل علامة لـ${safe(p.name)}">+ علامة</button><button class="counter-undo" type="button" data-counter-action="undo" data-counter-person="${id}" ${p.can_undo?'':'disabled'} aria-label="تراجع عن آخر علامة لـ${safe(p.name)}">↶ تراجع</button><details class="counter-history"><summary>آخر العلامات</summary>${p.recent?.length?p.recent.map(e=>`<div class="counter-event ${e.undone_at?'undone':''}"><span>${safe(e.note||'علامة بدون ملاحظة')}<small>${new Date(e.created_at).toLocaleString('ar-OM',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Muscat'})}${e.undone_at?' · تم التراجع عنها':''}</small></span></div>`).join(''):'<p>لا توجد علامات مسجّلة.</p>'}</details></article>`).join('')}`;
 Object.entries(drafts).forEach(([id,value])=>{const e=document.getElementById(id);if(e)e.value=value});
 }
 return {display,phone};
})();
if(document.querySelector('#counterDisplay')){
 let counterPolling=false;
 async function loadCounters(){if(counterPolling)return;counterPolling=true;try{const r=await fetch('/api/counters',{cache:'no-store'});if(!r.ok)throw Error();BehaviorView.display(await r.json());document.querySelector('#counterConnection').textContent=''}catch(e){document.querySelector('#counterConnection').textContent='تعذّر تحديث العدّاد · آخر أرقام محفوظة'}finally{counterPolling=false}}
 loadCounters();setInterval(loadCounters,2000);
}
if(document.querySelector('#counterPhone')){
 const counterPending=new Map();
 document.querySelector('#counterPhone').addEventListener('click',async e=>{
 const button=e.target.closest('[data-counter-action]');if(!button||button.disabled||busy||!state?.behavior)return;
 const person=button.dataset.counterPerson,action=button.dataset.counterAction,input=document.getElementById('counter-note-'+person),note=action==='add'?input.value.trim():'';
 const key=JSON.stringify([person,action,note]);let request_id=counterPending.get(key);if(!request_id){request_id=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>n.toString(16).padStart(2,'0')).join('');counterPending.set(key,request_id)}
 const ok=await mutate('/api/parent/counters',{person,action,note,revision:state.behavior.revision,request_id},null,action==='add'?'سُجّلت علامة '+state.behavior.people[person].name:'تم التراجع عن آخر علامة');
 if(ok){counterPending.delete(key);if(action==='add')document.getElementById('counter-note-'+person).value=''}else await refresh();
 });
}
