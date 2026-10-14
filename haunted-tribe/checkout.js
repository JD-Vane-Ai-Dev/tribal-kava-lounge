(() => {
  const $ = id => document.getElementById(id);
  const form = $('checkout-form'); const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
  let config; let stripe; let elements; let paymentElement; let activeOrder; let requestId = crypto.randomUUID(); let busy = false;
  const qty = id => Math.max(0, Math.min(20, Number($(id).value) || 0));
  function cart() { return { adult: qty('adult'), child: qty('child'), shirts: [...$('sizes').querySelectorAll('select')].map(s => s.value) }; }
  function refresh() {
    const values = [...$('sizes').querySelectorAll('select')].map(s => s.value);
    $('sizes').replaceChildren();
    for (let i = 0; i < qty('bundle'); i++) {
      const label = document.createElement('label'); label.textContent = `Shirt ${i + 1} size`;
      const select = document.createElement('select'); select.required = true; select.name = `shirt-${i}`;
      for (const size of ['', 'S', 'M', 'L', 'XL']) { const option = new Option(size || 'Choose size', size); select.add(option); }
      select.value = values[i] || ''; label.append(select); $('sizes').append(label);
    }
    const c = cart(); const total = c.adult * 1000 + c.child * 500 + c.shirts.length * 2500;
    $('summary-lines').replaceChildren();
    for (const [label, count, price] of [['Adult entry', c.adult, 1000], ['Kids’ entry', c.child, 500], ['Shirt + admission', c.shirts.length, 2500]]) {
      if (!count) continue;
      const row = document.createElement('div'); row.className = 'summary-line';
      const text = document.createElement('span'); text.textContent = `${count} × ${label}`;
      const value = document.createElement('span'); value.textContent = money(count * price); row.append(text, value); $('summary-lines').append(row);
    }
    $('total').textContent = money(total);
  }
  function unlock() { for (const control of form.elements) control.disabled = false; $('continue').disabled = !config?.enabled; }
  form.addEventListener('input', event => {
    if (['adult', 'child', 'bundle'].includes(event.target.id)) refresh();
    requestId = crypto.randomUUID();
  });
  $('edit-order').addEventListener('click', () => {
    if (busy) return;
    paymentElement?.destroy(); paymentElement = null; activeOrder = null; elements = null;
    $('payment').hidden = true; unlock(); requestId = crypto.randomUUID(); $('adult').focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !config?.enabled || !form.reportValidity()) return;
    const c = cart(); if (c.adult + c.child + c.shirts.length < 1 || c.adult + c.child + c.shirts.length > 20) { $('checkout-status').textContent = 'Choose between 1 and 20 admissions per order.'; return; }
    const input = { ...c, name: form.elements.name.value, email: form.elements.email.value, accepted: form.elements.accepted.checked, requestId };
    busy = true; $('continue').disabled = true; $('checkout-status').textContent = 'Preparing your secure checkout…';
    try {
      const response = await fetch('/api/haunt/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to open checkout.');
      activeOrder = data;
      stripe ||= Stripe(config.publishableKey);
      elements = stripe.elements({ clientSecret: data.clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#3dff7a', colorBackground: '#151a13', colorText: '#ede6d3', colorDanger: '#ff7389', borderRadius: '0px', fontFamily: 'Arial, sans-serif' } } });
      paymentElement = elements.create('payment', { layout: 'tabs' }); paymentElement.mount('#payment-element');
      $('locked-summary').textContent = `${input.name} · ${c.adult + c.child + c.shirts.length} admission(s) · ${money(data.amount)}`;
      $('pay').textContent = `PAY ${money(data.amount)} & GET TICKETS`;
      for (const control of form.elements) control.disabled = true;
      $('payment').hidden = false; $('payment').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('checkout-status').textContent = 'Your order is ready. Complete payment below.';
    } catch (error) { $('checkout-status').textContent = error.message; unlock(); }
    finally { busy = false; }
  });
  $('pay').addEventListener('click', async () => {
    if (busy || !activeOrder) return;
    busy = true; $('pay').disabled = true; $('edit-order').disabled = true; $('payment-status').textContent = 'Confirming payment…';
    const returnUrl = `${location.origin}/haunted-tribe/tickets/#${activeOrder.orderId}.${activeOrder.accessToken}`;
    try {
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required' });
      if (result.error) throw new Error(result.error.message);
      location.assign(returnUrl);
    } catch (error) { $('payment-status').textContent = error.message || 'Payment could not be completed. Please try again.'; }
    finally { busy = false; $('pay').disabled = false; $('edit-order').disabled = false; }
  });
  refresh();
  fetch('/api/haunt/config').then(async r => { if (!r.ok) throw new Error(); config = await r.json();
    if (!config.enabled || !window.Stripe) throw new Error(); $('continue').disabled = false; $('continue').textContent = 'CONTINUE TO PAYMENT';
  }).catch(() => { $('continue').textContent = 'PRESALE NOT OPEN'; $('checkout-status').textContent = Date.now() >= Date.parse('2026-10-30T19:00:00-04:00') ? 'Presale has ended. Adult entry is $15 and kids ages 5–12 are $10 at the door.' : 'Online checkout is being prepared. Please check back soon.'; });
})();
