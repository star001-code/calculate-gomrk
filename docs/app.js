const BASE = './attached_assets/';
const PRODUCTS_URL = BASE + 'ALL_PRODUCTS_WITH_DECISION_CLEAN.json';
const TARIFF_URL = BASE + 'tariff_law22_2010.json';

let products = [];
let tariff = { hs_rates: {}, chapter_defaults: {} };
let calcItems = [];

const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const norm = (v) => String(v || '').replace(/[^\d]/g, '');
const num = (v) => {
  const n = Number(String(v || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function dutyFor(hs) {
  hs = norm(hs);
  const rates = tariff.hs_rates || {};
  const ch = tariff.chapter_defaults || {};

  if (rates[hs] != null) return rates[hs];
  if (hs.length >= 6 && rates[hs.slice(0, 6)] != null) return rates[hs.slice(0, 6)];
  if (ch[hs.slice(0, 2)] != null) return ch[hs.slice(0, 2)];

  return 20;
}

function mapProduct(x, i) {
  const d = x.decision || {};
  const mn = num(x.GDS_MIN);
  const mx = num(x.GDS_MAX);
  let av = num(x.GDS_YER);

  if (!av && mn && mx) av = (mn + mx) / 2;

  return {
    id: i + 1,
    hs: norm(x.IDE_HSC_NB1 || x.hs_code || x.hsCode),
    desc: String(x.product || x.description || '').trim(),
    unit: x.unit || '',
    min: mn,
    avg: av,
    max: mx,
    prot: !!x.protection,
    protPct: num(x.protection_percentage),
    action: d.action || '',
    risk: d.risk || ''
  };
}

async function loadData() {
  try {
    const [raw, tr] = await Promise.all([
      fetch(PRODUCTS_URL).then((r) => r.json()),
      fetch(TARIFF_URL).then((r) => r.json()).catch(() => ({}))
    ]);

    products = Array.isArray(raw)
      ? raw.map(mapProduct).filter((p) => p.hs || p.desc)
      : [];

    tariff = tr || tariff;
  } catch (e) {
    products = [];
  }

  $('productCount').textContent = fmt(products.length);
  $('readyProducts').textContent = fmt(products.length);
  $('tariffCount').textContent = fmt(products.length);
  $('hsCount').textContent = fmt(new Set(products.map((p) => p.hs)).size);

  renderProducts();
  renderTariff();
}

function closeModal() {
  const modal = $('productModal');
  if (modal) modal.hidden = true;
}

function openModal() {
  closeDrawer();
  $('productModal').hidden = false;
  $('modalSearch').value = '';
  $('modalResults').innerHTML = '';
  setTimeout(() => $('modalSearch').focus(), 50);
}

function openDrawer() {
  closeModal();
  $('drawer').classList.add('open');
  $('drawer').setAttribute('aria-hidden', 'false');
  $('overlay').hidden = false;
  document.body.classList.add('no-scroll');
}

function closeDrawer() {
  $('drawer').classList.remove('open');
  $('drawer').setAttribute('aria-hidden', 'true');
  $('overlay').hidden = true;
  document.body.classList.remove('no-scroll');
}

function page(id) {
  closeModal();
  closeDrawer();

  document.querySelectorAll('.page').forEach((p) => {
    p.classList.toggle('active', p.id === id);
  });

  document.querySelectorAll('[data-page]').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === id);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('menuBtn').onclick = openDrawer;
$('overlay').onclick = closeDrawer;

document.querySelectorAll('[data-page]').forEach((b) => {
  b.onclick = () => page(b.dataset.page);
});

document.querySelectorAll('[data-go]').forEach((b) => {
  b.onclick = () => page(b.dataset.go);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDrawer();
  }
});

$('themeToggle').onclick = () => {
  document.body.classList.toggle('light');
  localStorage.setItem(
    'theme',
    document.body.classList.contains('light') ? 'light' : 'dark'
  );
};

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
}

function card(p, action = false) {
  return `
    <div class="result-card">
      <div class="row">
        <strong>${p.desc || '-'}</strong>
        <span class="tag">${p.hs || '-'}</span>
      </div>
      <small>الوحدة: ${p.unit || '-'} · الرسم: ${dutyFor(p.hs)}% ${p.prot ? '· حماية ' + p.protPct + '%' : ''}</small>
      <small>القيمة الاستدلالية: ${fmt(p.avg)}</small>
      ${action ? `<button class="primary" onclick="selectProduct(${p.id})">إضافة للحاسبة</button>` : ''}
    </div>
  `;
}

function filtered(q) {
  q = (q || '').trim().toLowerCase();
  const digits = norm(q);

  if (!q) return [];

  return products
    .filter((p) => {
      return (
        (digits && p.hs.includes(digits)) ||
        p.desc.toLowerCase().includes(q)
      );
    })
    .slice(0, 60);
}

function renderProducts() {
  const q = $('productSearch').value;
  const rows = filtered(q);

  $('productsResults').innerHTML = q
    ? rows.map((p) => card(p, true)).join('') || '<div class="empty">لا توجد نتائج</div>'
    : '';
}

$('productSearch').oninput = renderProducts;

function renderTariff() {
  const q = $('tariffSearch').value;
  const rows = filtered(q).slice(0, 100);

  $('tariffResults').innerHTML = q
    ? rows.map((p) => `
      <div class="result-card">
        <div class="row">
          <strong>${p.hs}</strong>
          <span class="tag">${dutyFor(p.hs)}%</span>
        </div>
        <small>${p.desc || '-'}</small>
        <small>الوحدة: ${p.unit || '-'} · القيمة: ${fmt(p.avg)}</small>
      </div>
    `).join('') || '<div class="empty">لا توجد نتائج</div>'
    : '';
}

$('tariffSearch').oninput = renderTariff;

function selectProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  calcItems.push({
    hs: p.hs,
    desc: p.desc,
    qty: 1,
    value: p.avg || 0,
    duty: dutyFor(p.hs),
    paid: 0
  });

  renderCalc();
  closeModal();
  page('calculator');
}

window.selectProduct = selectProduct;

$('addProductBtn').onclick = openModal;

document.querySelector('.modal-close').onclick = closeModal;

$('productModal').addEventListener('click', (e) => {
  if (e.target === $('productModal')) closeModal();
});

$('modalSearch').oninput = () => {
  const rows = filtered($('modalSearch').value);

  $('modalResults').innerHTML =
    rows.map((p) => card(p, true)).join('') ||
    '<div class="empty">لا توجد نتائج</div>';
};

function renderCalc() {
  const box = $('calcItems');

  if (!calcItems.length) {
    box.innerHTML = '<div class="empty">لم تتم إضافة منتجات بعد. اضغط "إضافة منتج" للبدء.</div>';
    return;
  }

  box.innerHTML = calcItems.map((it, i) => `
    <div class="calc-item">
      <div class="row">
        <strong>${it.desc || it.hs}</strong>
        <button class="ghost" onclick="removeItem(${i})">حذف</button>
      </div>

      <span class="tag">${it.hs}</span>

      <div class="grid">
        <label>
          الكمية
          <input type="number" value="${it.qty}" oninput="editItem(${i}, 'qty', this.value)">
        </label>

        <label>
          القيمة USD
          <input type="number" value="${it.value}" oninput="editItem(${i}, 'value', this.value)">
        </label>

        <label>
          نسبة الرسم %
          <input type="number" value="${it.duty}" oninput="editItem(${i}, 'duty', this.value)">
        </label>

        <label>
          المدفوع USD
          <input type="number" value="${it.paid}" oninput="editItem(${i}, 'paid', this.value)">
        </label>
      </div>
    </div>
  `).join('');
}

window.editItem = (i, k, v) => {
  calcItems[i][k] = num(v);
};

window.removeItem = (i) => {
  calcItems.splice(i, 1);
  renderCalc();
};

$('clearCalcBtn').onclick = () => {
  calcItems = [];
  renderCalc();
  $('calcResult').hidden = true;
};

$('calculateBtn').onclick = () => {
  const fx = num($('fxRate').value) || 1320;
  let duty = 0;
  let paid = 0;

  calcItems.forEach((it) => {
    duty += num(it.qty) * num(it.value) * (num(it.duty) / 100);
    paid += num(it.paid);
  });

  const diff = duty - paid;

  $('calcResult').hidden = false;
  $('calcResult').innerHTML = `
    <strong>النتيجة</strong>
    <p>إجمالي الرسم: $${duty.toFixed(2)}</p>
    <p>المدفوع: $${paid.toFixed(2)}</p>
    <p>فرق الرسم: $${diff.toFixed(2)} = ${fmt(diff * fx)} د.ع</p>
  `;
};

$('saveKey').onclick = () => {
  localStorage.setItem('openaiKey', $('openaiKey').value.trim());
  alert('تم حفظ المفتاح محلياً');
  checkKey();
};

function checkKey() {
  const has = !!localStorage.getItem('openaiKey');
  $('keyWarning').style.display = has ? 'none' : 'block';
}

$('extractManifest').onclick = () => {
  $('manifestOutput').innerHTML = `
    <div class="result-card">
      <strong>تنبيه</strong>
      <small>قراءة الصور تحتاج مفتاح OpenAI وتكامل مباشر. هذه النسخة جاهزة للواجهة ورفع الصور، ويمكن ربطها لاحقاً بالمعالجة.</small>
    </div>
  `;
};

$('clearImages').onclick = () => {
  $('manifestFiles').value = '';
  $('manifestOutput').innerHTML = '';
};

checkKey();
loadData();
renderCalc();
