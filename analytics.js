/* Conversion and campaign tracking for Tribal Kava Lounge. */
(function () {
  'use strict';

  const config = window.TRIBAL_SITE_CONFIG || {};
  const measurementId = String(config.googleAnalyticsId || '').trim();
  const hasAnalytics = /^G-[A-Z0-9]+$/i.test(measurementId);
  const applicationInsightsConnectionString = String(config.applicationInsightsConnectionString || '').trim();
  const ApplicationInsights = window.Microsoft?.ApplicationInsights?.ApplicationInsights;
  const isProductionHost = ['thetribalkavalounge.com', 'www.thetribalkavalounge.com'].includes(window.location.hostname);
  let azureInsights = null;
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const campaignStorageKey = 'tribal_campaign_attribution';

  const matchesHost = (host, domain) => host === domain || host.endsWith(`.${domain}`);
  function referralChannel(host) {
    if (['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'copilot.microsoft.com', 'gemini.google.com'].some(domain => matchesHost(host, domain))) return 'ai_referral';
    if (/(^|\.)google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)
        || ['bing.com', 'duckduckgo.com', 'search.yahoo.com', 'search.brave.com', 'ecosia.org'].some(domain => matchesHost(host, domain))) return 'organic_search';
    return 'referral';
  }

  function saveCampaign(value) {
    try { sessionStorage.setItem(campaignStorageKey, JSON.stringify(value)); } catch (_) { /* Tracking still works when storage is blocked. */ }
  }

  function currentCampaign() {
    const params = new URLSearchParams(window.location.search);
    const incoming = {};
    campaignKeys.forEach((key) => {
      const value = params.get(key);
      if (value) incoming[key] = value.slice(0, 120);
    });

    let referrerHost = '';
    try {
      referrerHost = new URL(document.referrer || '').hostname.toLowerCase();
    } catch (_) { /* Missing referrers remain unknown/direct. */ }
    const external = referrerHost && !matchesHost(referrerHost, 'thetribalkavalounge.com');
    if (Object.keys(incoming).length) {
      const channel = referralChannel(String(incoming.utm_source || '').toLowerCase());
      incoming.traffic_channel = incoming.utm_medium === 'qa' ? 'qa'
        : channel === 'ai_referral' ? channel
        : incoming.utm_medium === 'organic' ? 'organic_search' : 'campaign';
      incoming.attribution_method = 'utm';
    } else if (external) {
      incoming.utm_source = referrerHost;
      incoming.traffic_channel = referralChannel(referrerHost);
      incoming.utm_medium = incoming.traffic_channel === 'organic_search' ? 'organic' : 'referral';
      incoming.attribution_method = 'referrer';
    } else {
      try {
        const saved = JSON.parse(sessionStorage.getItem(campaignStorageKey) || '{}');
        const age = Date.now() - Date.parse(saved.last_seen_at || saved.captured_at);
        if (saved.attribution_version === 2 && age >= 0 && age < 30 * 60 * 1000) return saved;
      } catch (_) { /* Start a fresh session attribution. */ }
      incoming.traffic_channel = 'direct_or_unknown';
      incoming.attribution_method = 'unavailable';
    }
    incoming.referrer_host = external ? referrerHost : '';
    incoming.landing_page = window.location.pathname;
    incoming.captured_at = new Date().toISOString();
    incoming.attribution_version = 2;
    saveCampaign(incoming);
    return incoming;
  }

  const attribution = currentCampaign();

  if (isProductionHost && /^InstrumentationKey=/i.test(applicationInsightsConnectionString) && typeof ApplicationInsights === 'function') {
    try {
      azureInsights = new ApplicationInsights({
        config: {
          connectionString: applicationInsightsConnectionString,
          enableAutoRouteTracking: false,
          enableCorsCorrelation: true
        }
      });
      azureInsights.loadAppInsights();
    } catch (error) {
      console.warn('Tribal telemetry could not initialize.', error);
      azureInsights = null;
    }
  }

  if (isProductionHost && hasAnalytics) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false,
      transport_type: 'beacon'
    });

    const loader = document.createElement('script');
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(loader);
  }

  function send(eventName, parameters) {
    attribution.last_seen_at = new Date().toISOString();
    saveCampaign(attribution);
    const payload = Object.assign({
      page_location: window.location.href,
      page_path: `${window.location.pathname}${window.location.search}`,
      campaign_source: attribution.utm_source || (attribution.attribution_method === 'utm' ? '(not set)' : '(direct)'),
      campaign_medium: attribution.utm_medium || (attribution.attribution_method === 'utm' ? '(not set)' : '(none)'),
      campaign_name: attribution.utm_campaign || '(not set)',
      traffic_channel: attribution.traffic_channel,
      referrer_host: attribution.referrer_host || '',
      attribution_method: attribution.attribution_method,
      attribution_version: 2
    }, parameters || {});

    if (isProductionHost && hasAnalytics && typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }

    if (azureInsights) {
      if (eventName === 'page_view') {
        azureInsights.trackPageView({
          name: payload.page_title || document.title,
          uri: payload.page_location || window.location.href,
          properties: payload
        });
      } else {
        azureInsights.trackEvent({ name: eventName }, payload);
      }
    }

    window.dispatchEvent(new CustomEvent('tribal:conversion', {
      detail: {
        eventName,
        payload,
        analyticsConnected: (isProductionHost && hasAnalytics) || Boolean(azureInsights),
        providers: {
          applicationInsights: Boolean(azureInsights),
          googleAnalytics: isProductionHost && hasAnalytics
        }
      }
    }));
  }

  function conversionForLink(link) {
    const explicit = link.dataset.conversion;
    if (explicit) return explicit;

    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) return 'phone_call';
    if (href.startsWith('sms:')) return 'vip_sms';
    if (href.startsWith('mailto:')) return href.includes('event') ? 'event_inquiry' : 'email';
    if (/google\.[^/]+\/maps|maps\.google/i.test(href)) return 'directions';
    if (/instagram\.com/i.test(href)) return 'instagram';
    if (/order\.online|doordash\.com/i.test(href)) return 'order_online';
    if (/\/private-events(?:$|[?#])/.test(href)) return 'event_interest';
    if (/\/events(?:$|[?#])/.test(href)) return 'events_view';
    if (/\/menu(?:$|[?#])/.test(href)) return 'menu_view';
    return '';
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const conversion = conversionForLink(link);
    if (!conversion) return;

    const details = {
      conversion_type: conversion,
      link_url: link.href,
      link_text: (link.textContent || '').trim().slice(0, 100)
    };
    send(conversion, details);

    if (['phone_call', 'directions', 'vip_sms', 'vip_email', 'email', 'event_inquiry', 'event_interest'].includes(conversion)) {
      send('generate_lead', Object.assign({ lead_type: conversion }, details));
    }
    if (conversion === 'order_online') {
      send('begin_checkout', Object.assign({ checkout_type: 'doordash_outbound' }, details));
    }
  });

  function pageView() {
    send('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${window.location.pathname}${window.location.search}`
    });
  }

  let routeEventSeen = false;
  window.addEventListener('tribal:navigation', () => {
    routeEventSeen = true;
    pageView();
  });
  window.tribalTrack = send;

  // Deferred scripts execute while the document is usually "interactive".
  // Wait for the router's DOMContentLoaded handler so its initial
  // tribal:navigation event owns the first page view. Only use the fallback
  // when analytics is injected after DOMContentLoaded has already finished.
  if (document.readyState === 'complete') {
    if (!routeEventSeen) pageView();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (!routeEventSeen) pageView();
    }, { once: true });
  }
})();
