(() => {
  const [id, access] = location.hash.slice(1).split('.');
  // Stripe may append a client secret on redirect. Remove it before any outgoing navigation.
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  let attempts = 0; let timer; let loading = false;
  const $ = id => document.getElementById(id);
  async function load() {
    if (loading) return; clearTimeout(timer);
    if (!id || !access) { $('status').textContent = 'Open the private ticket link from your order confirmation email.'; return; }
    loading = true; $('refresh').disabled = true;
    try {
      const r = await fetch(`/api/haunt/orders/${encodeURIComponent(id)}`, { headers: { 'X-Haunt-Ticket-Token': access } });
      const order = await r.json(); if (!r.ok) throw new Error(order.error);
      $('tickets').replaceChildren();
      if (order.status !== 'paid') {
        $('status').textContent = order.status === 'review' ? 'This order needs staff assistance before entry.' : 'Your payment is still being confirmed. Tickets appear after payment succeeds.';
        if (order.status === 'pending' && attempts++ < 12) timer = setTimeout(load, 5000);
        return;
      }
      $('status').textContent = 'Payment confirmed. Your tickets are ready.';
      $('order-summary').textContent = `${order.name} · Order ${order.id} · ${order.tickets.length} admission(s)`;
      for (const t of order.tickets) {
        const card = document.createElement('article'); card.className = 'ticket';
        const heading = document.createElement('h3'); heading.textContent = t.kind === 'bundle' ? `Shirt bundle · ${t.size}` : t.kind === 'child' ? 'Kids’ entry · ages 5–12' : 'Haunted House Entry';
        const img = document.createElement('img'); img.src = t.qr; img.alt = `Admission QR for ticket ${t.index + 1}`; img.width = 300; img.height = 300;
        const label = document.createElement('p'); label.textContent = `Ticket ${t.index + 1} · ${t.admission ? 'Entry redeemed' : 'One walkthrough'}`;
        const perks = document.createElement('p'); perks.className = 'micro'; perks.textContent = t.kind === 'child' ? 'Admission only. No drink perks.' : `Free shell: ${t.shell ? 'redeemed' : 'included'}.${t.kind === 'bundle' ? ` One BOGO, 9 PM–midnight: ${t.bogo ? 'redeemed' : 'included'}.` : ''}`;
        const code = document.createElement('code'); code.textContent = t.code; card.append(heading, img, label, perks, code); $('tickets').append(card);
      }
    } catch (e) { $('status').textContent = e.message || 'Unable to load tickets. Please refresh.'; }
    finally { loading = false; $('refresh').disabled = false; }
  }
  $('refresh').addEventListener('click', load); $('print').addEventListener('click', () => window.print()); load();
})();
