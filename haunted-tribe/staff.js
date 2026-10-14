(() => {
  const $ = id => document.getElementById(id);
  const scanned = location.hash.slice(1);
  if (scanned) { sessionStorage.setItem('haunt-scanned', scanned); history.replaceState(null, '', location.pathname); }
  const remembered = sessionStorage.getItem('haunt-scanned');
  if (remembered) $('query').value = remembered;
  async function post(path, data) {
    const r = await fetch(`/api/haunt/staff/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Staff request failed.'); return body;
  }
  function render(orders, selectedIndex) {
    $('orders').replaceChildren();
    for (const order of orders) {
      const section = document.createElement('section');
      const title = document.createElement('h2'); title.textContent = order.name;
      const meta = document.createElement('p'); meta.textContent = `Order ${order.id} · ${order.status}`; section.append(title, meta);
      for (const t of order.tickets) {
        if (selectedIndex !== undefined && selectedIndex !== t.index) continue;
        const card = document.createElement('article'); card.className = 'ticket';
        const heading = document.createElement('h3'); heading.textContent = `Ticket ${t.index + 1} · ${t.kind === 'bundle' ? `Shirt bundle (${t.size})` : t.kind === 'child' ? 'Child ages 5–12' : 'Adult'}`;
        card.append(heading); const actions = document.createElement('div'); actions.className = 'staff-actions';
        for (const [perk, label] of [['admission', 'Admit']]) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = t[perk] ? `${label} · USED` : label; button.disabled = Boolean(t[perk]);
          button.addEventListener('click', async () => {
            button.disabled = true;
            try { const updated = await post('redeem', { code: t.code, perk }); render([updated], selectedIndex); $('status').textContent = `${label}: redeemed successfully.`; }
            catch (e) { $('status').textContent = e.message; button.disabled = Boolean(t[perk]); }
          }); actions.append(button);
        }
        card.append(actions); section.append(card);
      }
      $('orders').append(section);
    }
  }
  async function lookup(event) {
    event?.preventDefault(); const query = $('query').value.trim();
    const input = /^[a-f0-9]{36}\.\d{1,2}\./.test(query) ? { code: query } : { query };
    try { const result = await post('lookup', input); $('login').hidden = true; $('status').textContent = result.orders.length ? 'Tickets found. Check the guest before redeeming.' : 'No matching orders. Search the exact full buyer name.'; render(result.orders, result.selectedIndex); sessionStorage.removeItem('haunt-scanned'); }
    catch (e) { $('orders').replaceChildren(); $('status').textContent = e.message; }
  }
  $('lookup').addEventListener('submit', lookup); if (remembered) lookup();
})();
