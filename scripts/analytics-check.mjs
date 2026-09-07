import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler, options = {}) {
    const entries = this.listeners.get(type) || [];
    entries.push({ handler, once: Boolean(options?.once) });
    this.listeners.set(type, entries);
  }

  dispatchEvent(event) {
    const entries = [...(this.listeners.get(event.type) || [])];
    for (const entry of entries) {
      entry.handler.call(this, event);
      if (entry.once) {
        this.listeners.set(event.type, (this.listeners.get(event.type) || []).filter((candidate) => candidate !== entry));
      }
    }
    return true;
  }
}

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

const source = await readFile(new URL('../analytics.js', import.meta.url), 'utf8');
const windowEvents = new FakeEventTarget();
const documentEvents = new FakeEventTarget();
const pageViews = [];

// app.js is loaded before analytics.js and registers the router first.
documentEvents.addEventListener('DOMContentLoaded', () => {
  windowEvents.dispatchEvent(new FakeCustomEvent('tribal:navigation', {
    detail: { route: 'home', path: '/' }
  }));
});

class FakeApplicationInsights {
  loadAppInsights() {}
  trackPageView(payload) { pageViews.push(payload); }
  trackEvent() {}
}

const location = {
  href: 'https://www.thetribalkavalounge.com/',
  hostname: 'www.thetribalkavalounge.com',
  pathname: '/',
  search: ''
};
const fakeWindow = {
  TRIBAL_SITE_CONFIG: {
    googleAnalyticsId: '',
    applicationInsightsConnectionString: 'InstrumentationKey=00000000-0000-0000-0000-000000000000'
  },
  Microsoft: { ApplicationInsights: { ApplicationInsights: FakeApplicationInsights } },
  location,
  addEventListener: windowEvents.addEventListener.bind(windowEvents),
  dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents)
};
const fakeDocument = {
  readyState: 'interactive',
  title: 'Tribal Kava Lounge',
  addEventListener: documentEvents.addEventListener.bind(documentEvents),
  dispatchEvent: documentEvents.dispatchEvent.bind(documentEvents),
  createElement: () => ({}),
  head: { appendChild() {} }
};

vm.runInNewContext(source, {
  window: fakeWindow,
  document: fakeDocument,
  location,
  sessionStorage: storage(),
  localStorage: storage(),
  CustomEvent: FakeCustomEvent,
  URL,
  URLSearchParams,
  console
}, { filename: 'analytics.js' });

assert.equal(pageViews.length, 0, 'deferred analytics must wait for the router while the document is interactive');
documentEvents.dispatchEvent(new FakeCustomEvent('DOMContentLoaded'));
assert.equal(pageViews.length, 1, 'initial router navigation must produce exactly one page view');
assert.equal(pageViews[0].properties.campaign_source, '(direct)');

windowEvents.dispatchEvent(new FakeCustomEvent('tribal:navigation', {
  detail: { route: 'menu', path: '/menu' }
}));
assert.equal(pageViews.length, 2, 'a later SPA navigation must still produce one additional page view');

function attributionFor({referrer = '', search = '', saved = null, blocked = false} = {}) {
  const events = [];
  const session = storage();
  if (saved) session.setItem('tribal_campaign_attribution', JSON.stringify(saved));
  const failStorage = {getItem() {throw Error('blocked');}, setItem() {throw Error('blocked');}};
  const testLocation = {...location, search, href: location.href + search};
  const win = {...fakeWindow, location: testLocation, addEventListener() {}, dispatchEvent() {},
    Microsoft: {ApplicationInsights: {ApplicationInsights: class {
      loadAppInsights() {}
      trackPageView(event) {events.push(event.properties);}
      trackEvent() {}
    }}}};
  vm.runInNewContext(source, {
    window: win, document: {...fakeDocument, readyState: 'complete', referrer},
    location: testLocation, sessionStorage: blocked ? failStorage : session,
    localStorage: {getItem() {throw Error('stale attribution must not be read');}},
    CustomEvent: FakeCustomEvent, URL, URLSearchParams, console
  });
  return events[0];
}
assert.equal(attributionFor({referrer:'https://www.google.com/search?q=kava'}).traffic_channel, 'organic_search');
assert.equal(attributionFor({referrer:'https://www.google.co.uk/'}).campaign_source, 'www.google.co.uk');
for (const host of ['chatgpt.com', 'www.perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com']) {
  assert.equal(attributionFor({referrer:`https://${host}/some-private-path`}).traffic_channel, 'ai_referral');
}
assert.equal(attributionFor({referrer:'https://chatgpt.com.attacker.example/'}).traffic_channel, 'referral');
assert.equal(attributionFor({referrer:'https://google.example.com/'}).traffic_channel, 'referral');
assert.equal(attributionFor({referrer:'https://www.google.com/',search:'?utm_source=instagram&utm_medium=paid'}).campaign_source, 'instagram');
assert.equal(attributionFor({search:'?utm_source=chatgpt.com'}).traffic_channel, 'ai_referral');
assert.equal(attributionFor({search:'?utm_medium=qa'}).traffic_channel, 'qa');
const recent = {attribution_version:2, captured_at:new Date().toISOString(), utm_source:'bing.com', utm_medium:'organic', traffic_channel:'organic_search'};
assert.equal(attributionFor({referrer:'https://www.thetribalkavalounge.com/menu',saved:recent}).campaign_source, 'bing.com');
assert.equal(attributionFor({saved:{...recent,captured_at:'2020-01-01'}}).traffic_channel, 'direct_or_unknown');
assert.equal(attributionFor({saved:{utm_source:'old-campaign'}}).campaign_source, '(direct)');
assert.equal(attributionFor({referrer:'https://www.google.com/',blocked:true}).traffic_channel, 'organic_search');
assert.equal(attributionFor({referrer:'https://chatgpt.com/private?secret=1'}).referrer_host, 'chatgpt.com');
console.log('Analytics checks passed (routing, organic/AI referrals, campaign priority, storage failures, and stale attribution).');
