import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function formatCurrency(value) {
  const number = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    maximumFractionDigits: 0,
  }).format(number);
}

function parseNumber(value) {
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function App() {
  const [itemPrice, setItemPrice] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [customsRate, setCustomsRate] = useState('5');
  const [extraFees, setExtraFees] = useState('0');

  const result = useMemo(() => {
    const price = parseNumber(itemPrice);
    const shipping = parseNumber(shippingCost);
    const rate = parseNumber(customsRate);
    const fees = parseNumber(extraFees);
    const taxableAmount = price + shipping;
    const customs = taxableAmount * (rate / 100);
    const total = taxableAmount + customs + fees;

    return { price, shipping, rate, fees, taxableAmount, customs, total };
  }, [itemPrice, shippingCost, customsRate, extraFees]);

  function resetForm() {
    setItemPrice('');
    setShippingCost('');
    setCustomsRate('5');
    setExtraFees('0');
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">أداة مجانية</p>
        <h1>حاسبة الجمارك</h1>
        <p className="subtitle">
          احسب التكلفة التقريبية للمنتج بعد الشحن والجمارك والرسوم الإضافية.
        </p>
      </section>

      <section className="calculator-card" aria-label="حاسبة الجمارك">
        <div className="form-grid">
          <label>
            سعر المنتج
            <input
              inputMode="decimal"
              placeholder="مثال: 250000"
              value={itemPrice}
              onChange={(event) => setItemPrice(event.target.value)}
            />
          </label>

          <label>
            تكلفة الشحن
            <input
              inputMode="decimal"
              placeholder="مثال: 30000"
              value={shippingCost}
              onChange={(event) => setShippingCost(event.target.value)}
            />
          </label>

          <label>
            نسبة الجمارك %
            <input
              inputMode="decimal"
              placeholder="مثال: 5"
              value={customsRate}
              onChange={(event) => setCustomsRate(event.target.value)}
            />
          </label>

          <label>
            رسوم إضافية
            <input
              inputMode="decimal"
              placeholder="مثال: 10000"
              value={extraFees}
              onChange={(event) => setExtraFees(event.target.value)}
            />
          </label>
        </div>

        <div className="actions">
          <button type="button" onClick={resetForm}>تصفير</button>
        </div>

        <div className="summary">
          <div>
            <span>قيمة المنتج + الشحن</span>
            <strong>{formatCurrency(result.taxableAmount)}</strong>
          </div>
          <div>
            <span>قيمة الجمارك</span>
            <strong>{formatCurrency(result.customs)}</strong>
          </div>
          <div>
            <span>الرسوم الإضافية</span>
            <strong>{formatCurrency(result.fees)}</strong>
          </div>
          <div className="total">
            <span>الإجمالي التقريبي</span>
            <strong>{formatCurrency(result.total)}</strong>
          </div>
        </div>
      </section>

      <p className="notice">
        ملاحظة: النتيجة تقريبية وليست تسعيرة رسمية. النسب والرسوم تختلف حسب نوع البضاعة والقوانين المحلية.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
