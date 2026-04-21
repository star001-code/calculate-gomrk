'use strict';
const $ = (id)=>document.getElementById(id);

let apiBase = localStorage.getItem('API_BASE') || 'http://localhost:8000';
$('apiBase').value = apiBase;

const state = { items: [], checkpoints: [], lastResult: null };

function toNum(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function fmt(n){ const x=Number(n); return Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:2}):'0'; }
function normHs(s){ return (s||'').toString().replace(/[^\d]/g,'').trim(); }
function esc(s){ return (s??'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

async function fetchJson(url, opts){
  const r = await fetch(url, opts);
  if(!r.ok) throw new Error(await r.text());
  return await r.json();
}

async function loadCheckpoints(){
  const cps = await fetchJson(`${apiBase}/checkpoints`);
  state.checkpoints = cps;
  const sel = $('checkpoint');
  sel.innerHTML = '';
  cps.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id; o.textContent=c.name||c.id;
    sel.appendChild(o);
  });
}

async function doSearch(){
  const q = $('q').value.trim();
  if(q.length < 2) return;
  const res = await fetchJson(`${apiBase}/search?q=${encodeURIComponent(q)}&limit=30`);
  const wrap = $('results'); wrap.innerHTML='';
  if(!res.length){ wrap.innerHTML = `<div class="muted small">لا نتائج.</div>`; return; }
  res.forEach(r=>{
    const div=document.createElement('div');
    div.className='result';

    const top=document.createElement('div');
    top.className='top';

    const info=document.createElement('div');

    const hsDiv=document.createElement('div');
    const badge=document.createElement('span');
    badge.className='badge';
    badge.textContent='HS: '+(r.hs_code||'');
    hsDiv.appendChild(badge);
    info.appendChild(hsDiv);

    const descDiv=document.createElement('div');
    descDiv.className='desc';
    descDiv.textContent=r.description||'';
    info.appendChild(descDiv);

    const meta=document.createElement('div');
    meta.className='meta';
    [['unit',r.unit||''],['min',fmt(r.min_value)],['avg',fmt(r.avg_value)],['max',fmt(r.max_value)]].forEach(([label,val])=>{
      const span=document.createElement('span');
      span.textContent=label+': ';
      const code=document.createElement('code');
      code.textContent=val;
      span.appendChild(code);
      meta.appendChild(span);
    });
    info.appendChild(meta);

    const btn=document.createElement('button');
    btn.className='btn secondary';
    btn.textContent='استخدام';
    btn.addEventListener('click', ()=>{
      $('hs').value = r.hs_code||'';
      $('unit').value = r.unit||'';
      $('q').value=''; wrap.innerHTML='';
    });

    top.appendChild(info);
    top.appendChild(btn);
    div.appendChild(top);
    wrap.appendChild(div);
  });
}

function addItem(){
  const hs = normHs($('hs').value);
  const unit = $('unit').value.trim();
  const qty = toNum($('qty').value);
  const inv = toNum($('inv').value);
  const rate = toNum($('rate').value);
  if(!hs) return alert('أدخل HS');
  if(qty<=0) return alert('الكمية > 0');
  state.items.push({ hs_code: hs, unit, quantity: qty, invoice_total_value: inv, duty_rate: rate });
  render();
}

function render(){
  const tb=$('tbody'); tb.innerHTML='';
  state.items.forEach((it,i)=>{
    const tr=document.createElement('tr');
    const cells = [
      { text: String(i+1) },
      { text: it.hs_code, tag: 'code' },
      { text: it.description||'' },
      { text: fmt(it.quantity) },
      { text: it.unit||'' },
      { text: fmt(it.invoice_unit_value||0) },
      { text: fmt(it.tsc_unit_value||0) },
      { text: fmt(it.valuation_unit_value||0), tag: 'strong' },
      { text: fmt(it.customs_value_iqd||0) },
      { text: fmt(it.duty_iqd||0) },
    ];
    cells.forEach(c=>{
      const td=document.createElement('td');
      if(c.tag){
        const el=document.createElement(c.tag);
        el.textContent=c.text;
        td.appendChild(el);
      } else {
        td.textContent=c.text;
      }
      tr.appendChild(td);
    });
    const delTd=document.createElement('td');
    const delBtn=document.createElement('button');
    delBtn.className='btn danger smallbtn';
    delBtn.dataset.del=String(i);
    delBtn.textContent='حذف';
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);
    tb.appendChild(tr);
  });
  tb.querySelectorAll('button[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const i=Number(b.getAttribute('data-del'));
      state.items.splice(i,1);
      render();
    });
  });

  const dutySum = state.items.reduce((s,x)=>s+toNum(x.duty_iqd),0);
  const fees = state.lastResult?.fees?.total_iqd ?? 0;
  $('sumDuty').textContent = fmt(dutySum);
  $('sumFees').textContent = fmt(fees);
  $('sumTotal').textContent = fmt(dutySum + fees);
}

async function calculate(){
  if(!state.items.length) return alert('أضف أصناف أولاً');
  const payload = {
    checkpoint_id: $('checkpoint').value,
    fx_rate: toNum($('fx').value),
    invoice_currency: $('currency').value,
    items: state.items.map(it=>({
      hs_code: it.hs_code,
      unit: it.unit || null,
      quantity: it.quantity,
      invoice_total_value: it.invoice_total_value,
      duty_rate: it.duty_rate,
      tsc_basis: $('basis').value
    }))
  };
  const res = await fetchJson(`${apiBase}/calculate`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  state.lastResult = res;
  state.items = res.items.map((x, idx)=>({ ...state.items[idx], ...x }));
  $('out').textContent = JSON.stringify(res, null, 2);
  render();
}

function exportJson(){
  const out = state.lastResult || { items: state.items };
  const blob = new Blob([JSON.stringify(out, null, 2)], {type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='customs_calc_result.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

function resetAll(){
  state.items=[]; state.lastResult=null;
  $('out').textContent='';
  render();
}

async function loadStats(){
  const st = await fetchJson(`${apiBase}/stats`);
  $('statsBox').textContent = `Rows: ${st.rows_total} | HS unique: ${st.hs_unique} | Units unique: ${st.units_unique}`;
}

$('saveApi').addEventListener('click', async ()=>{
  apiBase = $('apiBase').value.trim() || apiBase;
  localStorage.setItem('API_BASE', apiBase);
  try{
    await loadCheckpoints();
    $('statsBox').textContent = 'تم الاتصال بالـ API ✅';
  }catch(e){
    $('statsBox').textContent = 'فشل الاتصال بالـ API ❌';
  }
});

$('searchBtn').addEventListener('click', doSearch);
$('q').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
$('add').addEventListener('click', addItem);
$('calc').addEventListener('click', calculate);
$('export').addEventListener('click', exportJson);
$('reset').addEventListener('click', resetAll);
$('loadStats').addEventListener('click', loadStats);

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

(async ()=>{
  try{ await loadCheckpoints(); }catch(e){}
  render();
})();