/* Client-Side Logic, SPA Routing, Interactive AI Guide & SEO Metadata Injector */

const SITE_ORIGIN = (window.TRIBAL_SITE_CONFIG && window.TRIBAL_SITE_CONFIG.canonicalOrigin) || 'https://www.thetribalkavalounge.com';

// SEO Metadata Database
const seoDatabase = {
    'home': {
        title: 'Tribal Kava Lounge | Kava Bar & Kratom Tea in West Palm Beach, FL',
        description: 'Visit Tribal Kava Lounge in West Palm Beach for traditional kava shells, brewed kratom tea, crafted drinks, games, events, and a welcoming alcohol-free night out. Kratom 21+ only.',
        h1: 'A Kava Lounge for a Better Night Out in West Palm Beach',
        slug: '/',
        schema: {
            "@context": "https://schema.org",
            "@type": ["CafeOrCoffeeShop", "LocalBusiness"],
            "name": "Tribal Kava Lounge",
            "alternateName": "Tribal Kava Bar",
            "logo": `${SITE_ORIGIN}/images/tribal-logo-cutout.png`,
            "image": [
                `${SITE_ORIGIN}/images/tribal-community-game-night.webp`,
                `${SITE_ORIGIN}/images/tribal-bar-game-night.webp`,
                `${SITE_ORIGIN}/images/tribal-mario-kart-racers.webp`
            ],
            "@id": `${SITE_ORIGIN}/#lounge`,
            "url": SITE_ORIGIN,
            "hasMenu": `${SITE_ORIGIN}/menu`,
            "telephone": "+1-561-355-0561",
            "email": "join@tribalkavalounge.co",
            "priceRange": "$$",
            "hasMap": "https://www.google.com/maps/search/?api=1&query=Tribal+Kava+Lounge&query_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y",
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-561-355-0561",
                "contactType": "customer service"
            },
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "770 S Military Trail, Unit A1",
                "addressLocality": "West Palm Beach",
                "addressRegion": "FL",
                "postalCode": "33415",
                "addressCountry": "US"
            },
            "areaServed": ["West Palm Beach", "Lake Worth", "Greenacres", "Palm Springs", "Haverhill"],
            "openingHoursSpecification": [
                {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
                    "opens": "08:00",
                    "closes": "00:00"
                },
                {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Friday", "Saturday"],
                    "opens": "08:00",
                    "closes": "01:00"
                }
            ],
            "sameAs": [
                "https://www.instagram.com/tribalkavalounge"
            ]
        }
    },
    'menu': {
        title: 'Menu | Kava Shells, Kratom Tea & Crafted Drinks in West Palm Beach',
        description: 'See current in-lounge prices plus the verified DoorDash pickup menu for kava shells, botanical tea, slushies, shots, flavors, and boosts at Tribal Kava Lounge. Kratom is 21+ only.',
        h1: 'Kava, Tea & Crafted Drink Menu',
        slug: '/menu',
        schema: {
            "@context": "https://schema.org",
            "@type": "Menu",
            "name": "Tribal Kava Lounge Botanical Beverage Menu",
            "mainEntityOfPage": `${SITE_ORIGIN}/menu`,
            "hasMenuSection": [
                {
                    "@type": "MenuSection",
                    "name": "Kava Shells",
                    "description": "Traditional kava shells: single $6, double $9, triple $13, and K.O. shell $10. $2 Tuesdays: single shells $2 from 2:00 PM–5:00 PM."
                },
                {
                    "@type": "MenuSection",
                    "name": "Crafted Kava",
                    "description": "Dessert-inspired kava drinks with clear $10 pricing."
                },
                {
                    "@type": "MenuSection",
                    "name": "Brewed Kratom Tea",
                    "description": "Red, white, or green leaf tea: small $6.50 or large 16 oz $8.75. 21+ only. Valid ID required."
                },
                {
                    "@type": "MenuSection",
                    "name": "Crafted Kratom Drinks",
                    "description": "Fruit-forward crafted drinks with brewed kratom tea. 21+ only. Valid ID required."
                },
                {
                    "@type": "MenuSection",
                    "name": "Kratom Shots",
                    "description": "Compact kratom shot options. 21+ only. Valid ID required."
                },
                {
                    "@type": "MenuSection",
                    "name": "Kratom Extracts",
                    "description": "Kratom Punch: 16 oz $15 or 24 oz $20. Kratom extract boost +$5. Adult-use extract options $15–25. 21+ only. Valid ID required."
                },
                {
                    "@type": "MenuSection",
                    "name": "Fruit Drinks",
                    "description": "Fresh, colorful drinks without kava or kratom."
                },
                {
                    "@type": "MenuSection",
                    "name": "DoorDash Pickup Menu",
                    "description": "Verified August 31, 2026: Single Shell $6.24, Double Shell $10.40, Botanical Slushie $14.58, Botanical Shot $7.01, Iced Tea small $10.25 or large $12.42, and Hot Tea small $7.27 or large $12.42. Marketplace pricing may differ from in-lounge pricing."
                },
                {
                    "@type": "MenuSection",
                    "name": "DoorDash Tea and Flavor Options",
                    "description": "Tea choices include red, green, or white leaf; 18 optional flavors; and optional Boost +$6.45, 5 ml +$11.34, or 10 ml +$22.15. Kratom products are 21+ only with valid ID."
                }
            ]
        }
    },
    'new-here': {
        title: 'Your First Visit to Tribal Kava Lounge | West Palm Beach',
        description: 'New to kava? Explore drinks by flavor, see the menu, and plan your first visit to Tribal Kava Lounge at 770 S Military Trail, Unit A1 in West Palm Beach.',
        h1: 'Your First Visit to Tribal Kava Lounge',
        slug: '/new-here',
        schema: {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "What is kava?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Kava is a traditional plant-based beverage made from the root of the kava plant. Traditional kava has an earthy taste, but our crafted kava drinks are designed to make the experience smoother and more familiar with creamy dessert-style flavors."
                    }
                },
                {
                    "@type": "Question",
                    "name": "What is kratom?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Kratom is a botanical beverage made from kratom leaves. We serve it as traditional-style brewed tea, fruit-forward drinks, compact shots, and adult-use extracts. All kratom products are 21+ only with valid ID."
                    }
                }
            ]
        }
    },
    'kava-vs-kratom': {
        title: 'Kava vs. Kratom | What’s the Difference?',
        description: 'Learn the simple difference between kava and kratom, how each is served, what first-timers should know, and how to choose your first drink responsibly.',
        h1: 'Kava vs. Kratom: What’s the Difference?',
        slug: '/kava-vs-kratom',
        schema: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": SITE_ORIGIN
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Kava vs. Kratom",
                    "item": `${SITE_ORIGIN}/kava-vs-kratom`
                }
            ]
        }
    },
    'events': {
        title: 'Events at Tribal Kava Lounge | Kava Lounge Events in West Palm Beach',
        description: 'See Friday Lotería with Tony, karaoke, $2 Tuesday shells, and rotating game, poker, Art Club, and Sip & Paint nights at Tribal Kava Lounge in West Palm Beach.',
        h1: 'Kava Lounge Events in West Palm Beach',
        slug: '/events',
        schema: {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "$2 Tuesday Kava Shells",
                    "url": `${SITE_ORIGIN}/events/two-dollar-tuesday`
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Friday Lotería with Tony",
                    "url": `${SITE_ORIGIN}/events/friday-loteria`
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "Karaoke Night at Tribal",
                    "url": `${SITE_ORIGIN}/events/karaoke`
                },
                {
                    "@type": "ListItem",
                    "position": 4,
                    "name": "Mario Kart and Game Nights",
                    "url": `${SITE_ORIGIN}/events/mario-kart`
                },
                {
                    "@type": "ListItem",
                    "position": 5,
                    "name": "Poker Night at Tribal",
                    "url": `${SITE_ORIGIN}/events/poker-night`
                },
                {
                    "@type": "ListItem",
                    "position": 6,
                    "name": "Art Club for Adults",
                    "url": `${SITE_ORIGIN}/events/art-club`
                },
                {
                    "@type": "ListItem",
                    "position": 7,
                    "name": "Sip and Paint at Tribal",
                    "url": `${SITE_ORIGIN}/events/sip-and-paint`
                }
            ]
        }
    },
    'visit': {
        title: 'Visit Tribal Kava Lounge | Kava Lounge in West Palm Beach',
        description: 'Visit Tribal Kava Lounge in West Palm Beach — free Wi‑Fi, first drink free, unlimited free parking, pool tables, and multiple seating sections. Hours, Unit A1 location, and first-time tips.',
        h1: 'Visit Our Kava Lounge in West Palm Beach',
        slug: '/visit',
        schema: {
            "@context": "https://schema.org",
            "@type": ["CafeOrCoffeeShop", "LocalBusiness"],
            "@id": `${SITE_ORIGIN}/#lounge`,
            "name": "Tribal Kava Lounge",
            "alternateName": "Tribal Kava Bar",
            "url": SITE_ORIGIN,
            "telephone": "+1-561-355-0561",
            "hasMenu": `${SITE_ORIGIN}/menu`,
            "hasMap": "https://www.google.com/maps/search/?api=1&query=Tribal+Kava+Lounge&query_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "770 S Military Trail, Unit A1",
                "addressLocality": "West Palm Beach",
                "addressRegion": "FL",
                "postalCode": "33415",
                "addressCountry": "US"
            }
        }
    },
    'tribal-kava-west-palm-beach': {
        title: 'Tribal Kava Lounge Is Open — Now at 770 S Military Trail',
        description: 'Tribal Kava Bar relocated from 404 S Military Trail. Tribal Kava Lounge is open at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415. Get directions, menu, and contact details.',
        h1: 'Tribal Kava Lounge Is Open — Now at 770 S Military Trail',
        slug: '/tribal-kava-west-palm-beach',
        schema: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'WebPage',
                    '@id': `${SITE_ORIGIN}/tribal-kava-west-palm-beach#page`,
                    url: `${SITE_ORIGIN}/tribal-kava-west-palm-beach`,
                    name: 'Tribal Kava Lounge Is Open — Now at 770 S Military Trail',
                    description: 'Tribal Kava Bar relocated from 404 S Military Trail and continues operating as Tribal Kava Lounge at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415.',
                    about: { '@id': `${SITE_ORIGIN}/#lounge` },
                    publisher: { '@id': `${SITE_ORIGIN}/#lounge` }
                },
                {
                    '@type': ['CafeOrCoffeeShop', 'LocalBusiness'],
                    '@id': `${SITE_ORIGIN}/#lounge`,
                    name: 'Tribal Kava Lounge',
                    alternateName: 'Tribal Kava Bar',
                    url: SITE_ORIGIN,
                    telephone: '+1-561-355-0561',
                    hasMenu: `${SITE_ORIGIN}/menu`,
                    hasMap: 'https://www.google.com/maps/search/?api=1&query=Tribal+Kava+Lounge&query_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y',
                    address: {
                        '@type': 'PostalAddress',
                        streetAddress: '770 S Military Trail, Unit A1',
                        addressLocality: 'West Palm Beach',
                        addressRegion: 'FL',
                        postalCode: '33415',
                        addressCountry: 'US'
                    }
                },
                {
                    '@type': 'FAQPage',
                    '@id': `${SITE_ORIGIN}/tribal-kava-west-palm-beach#faq`,
                    mainEntity: [
                        {
                            '@type': 'Question',
                            name: 'Is Tribal Kava permanently closed?',
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: 'No. Tribal Kava Bar relocated from 404 S Military Trail and continues operating as Tribal Kava Lounge at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415.'
                            }
                        },
                        {
                            '@type': 'Question',
                            name: 'Where is Tribal Kava now?',
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: 'Visit Tribal Kava Lounge at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415. Use the current-location directions on this page, or call (561) 355-0561 for help finding us.'
                            }
                        },
                        {
                            '@type': 'Question',
                            name: 'Is Lowkey Kava the same business as Tribal Kava?',
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: 'No. Lowkey Kava is a separate business at the former 404 S Military Trail location. Tribal Kava Lounge operates at 770 S Military Trail, Unit A1.'
                            }
                        }
                    ]
                }
            ]
        }
    },
    'faq': {
        title: 'Kava & Kratom FAQ | Tribal Kava Lounge',
        description: 'Get answers to common questions about kava, kratom, first-time visits, age requirements, non-alcoholic drinks, beginner-friendly options, and responsible use.',
        h1: 'Kava & Kratom FAQ',
        slug: '/faq',
        schema: {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Did Tribal Kava close or relocate?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Tribal Kava Bar relocated from 404 S Military Trail. Tribal Kava Lounge is open at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Is kratom 21+?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, all kratom products are for adults 21+ only. Valid ID is required for purchase."
                    }
                }
            ]
        }
    },

    'what-is-kava': {
        title: 'What Is Kava? Beginner Guide to Kava Drinks | Tribal Kava Lounge',
        description: 'What is kava? Learn culture, preparation, and flavor — plus how Tribal Kava Lounge serves kava shells and dessert-style crafted kava drinks in West Palm Beach.',
        h1: 'What Is Kava?',
        slug: '/what-is-kava',
        schema: {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "What Is Kava?",
            "description": "Beginner guide to kava drinks — culture, preparation, and flavor at Tribal Kava Lounge in West Palm Beach.",
            "mainEntityOfPage": `${SITE_ORIGIN}/what-is-kava`,
            "author": { "@type": "Organization", "name": "Tribal Kava Lounge" },
            "publisher": { "@type": "Organization", "name": "Tribal Kava Lounge", "telephone": "+1-561-355-0561" }
        }
    },
    'what-is-kratom': {
        title: 'What Is Kratom Tea? Beginner Guide for Adults 21+ | Tribal Kava Lounge',
        description: 'What is kratom tea? Formats we serve (tea, drinks, shots, extracts), Florida 21+ rules, flavor-first copy, and responsible-use notes. West Palm Beach.',
        h1: 'What Is Kratom Tea?',
        slug: '/what-is-kratom',
        schema: {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "What Is Kratom Tea?",
            "description": "Beginner guide to kratom beverages for adults 21+ at Tribal Kava Lounge.",
            "mainEntityOfPage": `${SITE_ORIGIN}/what-is-kratom`,
            "author": { "@type": "Organization", "name": "Tribal Kava Lounge" },
            "publisher": { "@type": "Organization", "name": "Tribal Kava Lounge" }
        }
    },
    'plan-your-visit': {
        title: 'Plan Your Visit | Tribal Kava Lounge West Palm Beach',
        description: 'Plan your visit to Tribal Kava Lounge — hours, free parking, Unit A1 address, first-timer tips, groups, and weekly events in West Palm Beach.',
        h1: 'Plan Your Visit',
        slug: '/plan-your-visit',
        schema: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Plan Your Visit",
            "url": `${SITE_ORIGIN}/plan-your-visit`
        }
    },
    'private-events': {
        title: 'Private Events | Host at Tribal Kava Lounge West Palm Beach',
        description: 'Host birthdays, creator meetups, study groups, and non-alcoholic private events at Tribal Kava Lounge in West Palm Beach.',
        h1: 'Host Something Different.',
        slug: '/private-events',
        schema: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Private Events",
            "url": `${SITE_ORIGIN}/private-events`
        }
    },
    'press': {
        title: 'Press & Social Proof | Tribal Kava Lounge',
        description: 'Press, reviews, and social proof for Tribal Kava Lounge — West Palm Beach non-alcoholic botanical lounge.',
        h1: 'Press & Social Proof',
        slug: '/press',
        schema: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Press & Social Proof",
            "url": `${SITE_ORIGIN}/press`
        }
    },
    'gift-cards': {
        title: 'Gift Cards Coming Soon | Tribal Kava Lounge',
        description: 'Digital gift cards for Tribal Kava Lounge in West Palm Beach are coming soon. Contact the lounge for availability.',
        h1: 'Gift Cards',
        slug: '/gift-cards',
        schema: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Gift Cards",
            "url": `${SITE_ORIGIN}/gift-cards`
        }
    },
    'nearby': {
        title: 'Kava Bar Near Lake Worth, Greenacres & Palm Springs | Tribal Kava Lounge',
        description: 'Looking for a kava bar near Lake Worth, Greenacres, Palm Springs, or Haverhill? Visit Tribal Kava Lounge at 770 S Military Trail in West Palm Beach.',
        h1: 'A Nearby Kava Lounge for Lake Worth, Greenacres & Palm Springs',
        slug: '/nearby',
        schema: {
            '@context': 'https://schema.org',
            '@type': ['CafeOrCoffeeShop', 'LocalBusiness'],
            name: 'Tribal Kava Lounge',
            url: `${SITE_ORIGIN}/nearby`,
            telephone: '+1-561-355-0561',
            address: {
                '@type': 'PostalAddress',
                streetAddress: '770 S Military Trail, Unit A1',
                addressLocality: 'West Palm Beach',
                addressRegion: 'FL',
                postalCode: '33415',
                addressCountry: 'US'
            },
            areaServed: [
                { '@type': 'City', name: 'West Palm Beach' },
                { '@type': 'City', name: 'Lake Worth Beach' },
                { '@type': 'City', name: 'Greenacres' },
                { '@type': 'City', name: 'Palm Springs' },
                { '@type': 'Place', name: 'Haverhill' }
            ]
        }
    },
    'the-daily-kava': {
        title: 'West Palm Beach Kava Stories & Local Guides | The Daily Kava',
        description: 'Fun, useful guides to kava, alcohol-free nightlife, date ideas, late-night study spots, events, and first visits in West Palm Beach.',
        h1: 'The Daily Kava',
        slug: '/the-daily-kava',
        schema: {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "The Daily Kava",
            "description": "Education, stories, and lounge life from Tribal Kava Lounge in West Palm Beach.",
            "url": `${SITE_ORIGIN}/the-daily-kava`,
            "publisher": {
                "@type": "Organization",
                "name": "Tribal Kava Lounge",
                "telephone": "+1-561-355-0561"
            }
        }
    }
};

const EVENT_TIME_ZONE = 'America/New_York';
const EVENT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nextWeeklyOccurrence(weekday, hour, minute = 0) {
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: EVENT_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
    const currentWeekday = EVENT_WEEKDAYS.indexOf(parts.weekday);
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const targetMinutes = hour * 60 + minute;
    let daysAhead = (weekday - currentWeekday + 7) % 7;
    if (daysAhead === 0 && currentMinutes >= targetMinutes) daysAhead = 7;

    const targetDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + daysAhead));
    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    return {
        iso: `${year}-${month}-${day}T${time}`,
        label: new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(targetDate)
    };
}

const nextTuesdaySpecial = nextWeeklyOccurrence(2, 14);
const nextFridayLoteria = nextWeeklyOccurrence(5, 21);

const eventDatabase = {
    'two-dollar-tuesday': {
        seoKey: 'event-two-dollar-tuesday',
        eyebrow: `Next Tuesday: ${nextTuesdaySpecial.label} · 2–5 PM`,
        title: '$2 Tuesday Kava Shells',
        intro: 'Single kava shells are $2 every Tuesday from 2:00 PM to 5:00 PM at Tribal Kava Lounge in West Palm Beach.',
        detail: 'No ticket and no mystery fine print. Stop in during the window, order a single traditional kava shell, and ask the team if it is your first visit.',
        sourceLabel: 'See all weekly events',
        sourceUrl: '/events',
        calendarUrl: '/events.ics',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: '$2 Tuesday Kava Shells at Tribal Kava Lounge',
            description: 'Single kava shells are $2 every Tuesday from 2 PM to 5 PM.',
            url: `${SITE_ORIGIN}/events/two-dollar-tuesday`
        }
    },
    'friday-loteria': {
        seoKey: 'event-friday-loteria',
        eyebrow: `Next game: ${nextFridayLoteria.label} · 9 PM`,
        title: 'Friday Lotería with Tony',
        intro: 'Tony hosts Lotería every Friday at 9:00 PM at Tribal Kava Lounge. Boards are $1 each.',
        detail: 'Bring a friend or join a table when you arrive. It is a recurring community night with prizes, jokes, and the very serious business of hoping your board gets called.',
        sourceLabel: 'See the official Friday Lotería post',
        sourceUrl: 'https://www.instagram.com/tribalkavalounge/p/DcYv5nFuNhF/',
        embedUrl: 'https://www.instagram.com/p/DcYv5nFuNhF/embed/captioned/',
        proofTitle: 'Friday Lotería flyer from @TribalKavaLounge',
        calendarUrl: '/events.ics',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: 'Friday Lotería with Tony at Tribal Kava Lounge',
            description: 'Weekly Friday Lotería at 9 PM. Hosted by Tony; boards are $1 each.',
            startDate: nextFridayLoteria.iso,
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            eventStatus: 'https://schema.org/EventScheduled',
            image: [
                `${SITE_ORIGIN}/images/tribal-community-game-night.webp`,
                `${SITE_ORIGIN}/images/tribal-bar-game-night.webp`,
                `${SITE_ORIGIN}/images/tribal-mario-kart-racers.webp`
            ],
            location: {
                '@type': 'Place',
                name: 'Tribal Kava Lounge',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: '770 S Military Trail, Unit A1',
                    addressLocality: 'West Palm Beach',
                    addressRegion: 'FL',
                    postalCode: '33415',
                    addressCountry: 'US'
                }
            },
            organizer: { '@type': 'Organization', name: 'Tribal Kava Lounge', url: SITE_ORIGIN },
            performer: { '@type': 'Person', name: 'Tony Robles' },
            sameAs: 'https://www.instagram.com/tribalkavalounge/p/DcYv5nFuNhF/',
            url: `${SITE_ORIGIN}/events/friday-loteria`
        }
    },
    'karaoke': {
        seoKey: 'event-karaoke',
        eyebrow: 'Recurring night · time announced on Instagram',
        title: 'Karaoke Night at Tribal',
        intro: 'Karaoke is part of Tribal’s recurring event lineup. The next confirmed date and start time are posted by @TribalKavaLounge.',
        detail: 'This page stays honest when the schedule moves: check the official Instagram before making the trip, then bring the song choice you have been “casually practicing” for three weeks.',
        sourceLabel: 'Check the next confirmed karaoke time',
        sourceUrl: 'https://www.instagram.com/tribalkavalounge',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Karaoke Night at Tribal Kava Lounge',
            description: 'Karaoke event information for Tribal Kava Lounge in West Palm Beach; confirm the next date on the official Instagram.',
            url: `${SITE_ORIGIN}/events/karaoke`
        }
    },
    'mario-kart': {
        seoKey: 'event-mario-kart',
        eyebrow: 'Rotating game night · next date on Instagram',
        title: 'Mario Kart & Game Nights',
        intro: 'Tribal has hosted real Mario Kart nights with Connor Taliaferro; the next tournament date is announced by @TribalKavaLounge.',
        detail: 'The first verified Mario Kart night ran August 15 at 9 PM, followed by another tournament on August 27. The official recap below shows the actual bar and community—not a staged stock photo. Check Instagram for the next race before making a special trip.',
        sourceLabel: 'See the official Mario Kart recap',
        sourceUrl: 'https://www.instagram.com/tribalkavalounge/p/DcMhfR2kY2X/',
        embedUrl: 'https://www.instagram.com/p/DcMhfR2kY2X/embed/captioned/',
        proofTitle: 'Mario Kart community-night recap from @TribalKavaLounge',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Mario Kart and Game Nights at Tribal Kava Lounge',
            description: 'Verified Mario Kart event history and current scheduling source for Tribal Kava Lounge in West Palm Beach.',
            url: `${SITE_ORIGIN}/events/mario-kart`,
            about: { '@type': 'Event', name: 'Mario Kart Game Night at Tribal Kava Lounge' }
        }
    },
    'poker-night': {
        seoKey: 'event-poker-night',
        eyebrow: 'Rotating cards night · next date on Instagram',
        title: 'Poker Night at Tribal',
        intro: 'Tribal’s first verified poker night welcomed every skill level, with cards starting at 6 PM and community prizes.',
        detail: 'The official June 14 flyer invited seasoned players and curious beginners for friendly competition, botanical drinks, community prizes, and bragging rights. That date has passed, so use the official post for proof and Instagram for the next confirmed table.',
        sourceLabel: 'See the official Poker Night post',
        sourceUrl: 'https://www.instagram.com/tribalkavalounge/p/DZVX-E0px7G/',
        embedUrl: 'https://www.instagram.com/p/DZVX-E0px7G/embed/captioned/',
        proofTitle: 'Poker Night flyer from @TribalKavaLounge',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Poker Night at Tribal Kava Lounge',
            description: 'Verified Poker Night history and current scheduling source for Tribal Kava Lounge in West Palm Beach.',
            url: `${SITE_ORIGIN}/events/poker-night`,
            about: { '@type': 'Event', name: 'Poker Night at Tribal Kava Lounge' }
        }
    },
    'art-club': {
        seoKey: 'event-art-club',
        eyebrow: 'Rotating creative night · next date on Instagram',
        title: 'Art Club for Adults',
        intro: 'Art Club has brought grown-up project time and guided painting to Tribal in partnership with Mingle & Grind.',
        detail: 'The verified August 26 flyer offered a bring-your-own-project session and a guided option with supplies, food, and snacks. That date has passed. Follow the source post and Tribal’s Instagram for the next confirmed creative night.',
        sourceLabel: 'See the original Art Club post',
        sourceUrl: 'https://www.instagram.com/mingle_and_grind/p/DbY2B49v2R_/',
        embedUrl: 'https://www.instagram.com/p/DbY2B49v2R_/embed/captioned/',
        proofTitle: 'Art Club flyer from event partner Mingle & Grind',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Art Club for Adults at Tribal Kava Lounge',
            description: 'Verified Art Club history and current scheduling source for Tribal Kava Lounge in West Palm Beach.',
            url: `${SITE_ORIGIN}/events/art-club`,
            about: { '@type': 'Event', name: 'Art Club for Adults at Tribal Kava Lounge' }
        }
    },
    'sip-and-paint': {
        seoKey: 'event-sip-and-paint',
        eyebrow: 'Rotating creative event · next date on Instagram',
        title: 'Sip & Paint at Tribal',
        intro: 'Tribal’s verified Sip & Paint paired an afternoon of art with a complimentary double kava shell or small cold tea.',
        detail: 'The August 8 event was hosted by Jules from 11 AM to 4 PM. Its $15 entry included painting materials and a complimentary double shell or small cold tea. That date has passed, so check the official post and Instagram for the next session.',
        sourceLabel: 'See the official Sip & Paint post',
        sourceUrl: 'https://www.instagram.com/tribalkavalounge/p/DbTyHIUphWx/',
        embedUrl: 'https://www.instagram.com/p/DbTyHIUphWx/embed/captioned/',
        proofTitle: 'Sip & Paint flyer from @TribalKavaLounge',
        schema: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Sip and Paint at Tribal Kava Lounge',
            description: 'Verified Sip and Paint history and current scheduling source for Tribal Kava Lounge in West Palm Beach.',
            url: `${SITE_ORIGIN}/events/sip-and-paint`,
            about: { '@type': 'Event', name: 'Sip and Paint at Tribal Kava Lounge' }
        }
    }
};

function hydrateRecurringEventDates() {
    document.querySelectorAll('[data-next-tuesday]').forEach((node) => {
        node.textContent = `Next: ${nextTuesdaySpecial.label} · 2–5 PM`;
    });
    document.querySelectorAll('[data-next-loteria]').forEach((node) => {
        node.textContent = `Next: ${nextFridayLoteria.label} · 9 PM`;
    });
}

const nearbyAreaDatabase = {
    'west-palm-beach': {
        seoKey: 'nearby-west-palm-beach',
        areaName: 'West Palm Beach',
        eyebrow: 'Our one and only location · West Palm Beach',
        title: 'Kava Lounge in West Palm Beach',
        intro: 'Tribal Kava Lounge is physically located at 770 S Military Trail, Unit A1 in West Palm Beach—not a directory listing or a second location.',
        description: 'Visit Tribal Kava Lounge at 770 S Military Trail, Unit A1 in West Palm Beach for kava shells, brewed tea, crafted drinks, events, free parking, and late-night lounge hours.',
        origin: 'West Palm Beach, FL',
        visitTitle: 'Come for a first sip or stay for the room',
        visitCopy: 'Order a traditional shell, use the three-question drink finder, meet friends for Lotería, or settle into a seating section with free Wi-Fi. The bar is built for first-timers as much as regulars.',
        planTitle: 'Finding Unit A1',
        planCopy: 'Use live directions rather than relying on an old address. Look for Unit A1 at 770 South Military Trail and use the open-lot parking on site.',
        localTitle: 'West Palm Beach hours',
        localCopy: 'Open Sunday through Thursday from 8 AM to midnight and Friday through Saturday from 8 AM to 1 AM. Check the live open-status banner before leaving.',
        faq: [
            ['Is Tribal Kava Lounge actually in West Palm Beach?', 'Yes. The lounge is at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415.'],
            ['Does the West Palm Beach location have parking?', 'Yes. Guests can use the open-lot parking at the lounge.']
        ]
    },
    'lake-worth': {
        seoKey: 'nearby-lake-worth',
        areaName: 'Lake Worth Beach',
        eyebrow: 'Serving Lake Worth Beach · located in West Palm Beach',
        title: 'Kava Lounge Near Lake Worth',
        intro: 'Looking from Lake Worth Beach? Tribal has one location: 770 S Military Trail, Unit A1 in West Palm Beach. Use the route button below for current navigation from Lake Worth.',
        description: 'Looking for a kava lounge near Lake Worth Beach? Get live directions to Tribal Kava Lounge in West Palm Beach for clear prices, free parking, events, and late-night hours.',
        origin: 'Lake Worth Beach, FL',
        visitTitle: 'A useful stop when the group wants different things',
        visitCopy: 'One person can try a shell, another can choose a fruit drink without kava or kratom, and the first-timer can use the drink finder before reaching the counter. Pool tables, Wi-Fi, and multiple seating sections make a longer visit easy.',
        planTitle: 'Before leaving Lake Worth',
        planCopy: 'Open the live route so traffic and your exact starting point are accounted for. The destination should read 770 S Military Trail, Unit A1, West Palm Beach—not the retired South Military Trail address.',
        localTitle: 'Late-night option without alcohol',
        localCopy: 'The lounge stays open until midnight Sunday through Thursday and 1 AM Friday and Saturday. Kava, brewed tea, crafted drinks, and fruit drinks are non-alcoholic; kratom is 21+ with valid ID.',
        faq: [
            ['Is there a Tribal Kava Lounge location in Lake Worth?', 'No. Tribal has one location at 770 S Military Trail, Unit A1 in West Palm Beach and serves guests coming from Lake Worth Beach.'],
            ['Can I order before driving from Lake Worth?', 'Yes. The Order Online buttons open the active Tribal DoorDash storefront.']
        ]
    },
    'greenacres': {
        seoKey: 'nearby-greenacres',
        areaName: 'Greenacres',
        eyebrow: 'Serving Greenacres · located in West Palm Beach',
        title: 'Kava Lounge Near Greenacres',
        intro: 'Tribal welcomes Greenacres guests at its single West Palm Beach location: 770 S Military Trail, Unit A1. Use live directions for the route from wherever you are starting.',
        description: 'Find a kava lounge near Greenacres at Tribal Kava Lounge in West Palm Beach. Explore clear menu prices, beginner guidance, events, free parking, and live directions.',
        origin: 'Greenacres, FL',
        visitTitle: 'Easy for first-timers and mixed groups',
        visitCopy: 'Choose traditional kava, a crafted botanical drink, or a fruit drink with no kava or kratom. If the menu is new territory, the drink finder narrows it down by flavor, botanical preference, and vibe.',
        planTitle: 'Before leaving Greenacres',
        planCopy: 'Use the route button for current navigation to Unit A1. When you arrive, use the open-lot parking and look for the Tribal Kava Lounge entrance rather than an old online address.',
        localTitle: 'Events worth checking first',
        localCopy: 'Friday Lotería with Tony runs at 9 PM, Tuesday single shells are $2 from 2–5 PM, and karaoke, games, poker, and art nights rotate. Check each event page before making a special trip.',
        faq: [
            ['Is Tribal Kava Lounge located in Greenacres?', 'No. Tribal is located at 770 S Military Trail, Unit A1 in West Palm Beach and welcomes guests from Greenacres.'],
            ['Where can I confirm events before leaving Greenacres?', 'Use the Events page for shareable details and the linked official Instagram posts for the latest rotating dates.']
        ]
    }
};

Object.entries(eventDatabase).forEach(([slug, event]) => {
    seoDatabase[event.seoKey] = {
        title: `${event.title} | Tribal Kava Lounge West Palm Beach`,
        description: event.intro,
        slug: `/events/${slug}`,
        schema: event.schema
    };
});

Object.entries(nearbyAreaDatabase).forEach(([slug, area]) => {
    const pageUrl = `${SITE_ORIGIN}/nearby/${slug}`;
    seoDatabase[area.seoKey] = {
        title: `${area.title} | Tribal Kava Lounge`,
        description: area.description,
        slug: `/nearby/${slug}`,
        schema: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'WebPage',
                    '@id': `${pageUrl}#webpage`,
                    url: pageUrl,
                    name: area.title,
                    description: area.description,
                    about: { '@id': `${SITE_ORIGIN}/#lounge` }
                },
                {
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
                        { '@type': 'ListItem', position: 2, name: 'Nearby areas', item: `${SITE_ORIGIN}/nearby` },
                        { '@type': 'ListItem', position: 3, name: area.areaName, item: pageUrl }
                    ]
                },
                {
                    '@type': ['CafeOrCoffeeShop', 'LocalBusiness'],
                    '@id': `${SITE_ORIGIN}/#lounge`,
                    name: 'Tribal Kava Lounge',
                    url: SITE_ORIGIN,
                    telephone: '+1-561-355-0561',
                    address: {
                        '@type': 'PostalAddress',
                        streetAddress: '770 S Military Trail, Unit A1',
                        addressLocality: 'West Palm Beach',
                        addressRegion: 'FL',
                        postalCode: '33415',
                        addressCountry: 'US'
                    },
                    areaServed: { '@type': 'City', name: area.areaName }
                }
            ]
        }
    };
});

// AI Guide Knowledge Base Responses
const aiKnowledgeBase = {
    // Core disclaimers
    safetyDisclaimer: "I can help explain the menu and general responsible-use information, but I cannot give medical or dosing advice. For health, medication, pregnancy, nursing, or treatment-related questions, please speak with a qualified professional.",
    benefitsDisclaimer: "We do not market kava or kratom as medical products or treatments. We focus on flavor, social experience, botanical beverage education, and responsible adult use. People report different experiences, but effects can vary, and we do not guarantee effects or recommend use for any medical purpose.",
    effectsDisclaimer: "People report different experiences, and effects can vary. We do not guarantee effects or recommend kava or kratom for any medical purpose. We recommend asking our team for beginner-friendly options and using these beverages responsibly.",
    
    // Knowledge keys
    'what is kava': "Kava is a traditional plant-based beverage made from the root of the kava plant (Piper methysticum), historically native to the Pacific Islands. Traditionally, kava is ground and strained with water, leaving an earthy taste. At Tribal Kava Lounge, we serve traditional shells and dessert-inspired crafted kava drinks like Banana Pudding to make a first order approachable.",
    'what is kratom': "Kratom is a botanical beverage made from the leaves of the Mitragyna speciosa tree, native to Southeast Asia. We serve red, white, and green leaf brewed tea, fruit-forward crafted drinks like Mango Chili Lime, compact shots, and adult-use extracts. All kratom products are strictly for adults 21+ only. Valid ID is required.",
    'do you have kratom extracts or shots': "Yes — we carry brewed kratom tea, crafted kratom drinks, kratom shots, and adult-use kratom extracts. All kratom products are for adults 21+ with valid ID. For extracts, please ask our team in person before ordering.",
    'kratom tea strains': "Yes — our **kratom tea** menu includes **red, white, and green** leaf styles, brewed traditional-style. All kratom tea is **21+ only** with valid ID. Ask our team which style fits the flavor profile you want.",
    'two dollar tuesday': "Yes — **$2 Tuesdays!** Single shells are **$2 from 2:00 PM–5:00 PM** every Tuesday. Come through and grab a shell.",
    'menu prices': "Here are our current in-lounge prices: **Kava shells:** single $6, double $9, triple $13, K.O. $10 · **Brewed kratom tea:** small $6.50 or large 16 oz $8.75 · **Kratom Punch:** 16 oz $15 or 24 oz $20 · **Kratom extract boost +$5** · **Crafted kava $10** · **Crafted kratom drinks $14** · **Kava or kratom shots $6** · **Kratom extracts $15–25** · **Fruit drinks $13**. Plus **$2 Tuesdays** — single shells $2 from 2–5 PM. Kratom is 21+ only.",
    'weekly events': "Weekly lineup: **Tuesday** = $2 single shells (2–5 PM) · recurring **Karaoke** nights · **Friday** = Lotería at 9 PM, hosted by Tony with $1 boards. Mario Kart, poker, Art Club, and Sip & Paint rotate in; check Instagram for the next date.",
    'karaoke': "Yes — Tribal hosts recurring Karaoke nights. Check **@TribalKavaLounge** on Instagram for the next confirmed start time.",
    'pool tournament': "We have pool tables, but there is no current recurring tournament time published. Check @TribalKavaLounge on Instagram for the next scheduled game or tournament night.",
    'loteria': "Yes — Tony hosts **Lotería every Friday at 9 PM**. Boards are $1 each.",
    'online ordering': "Online ordering is live through DoorDash from the Order Online buttons on this site. Digital gift cards are still coming soon. You can also visit us at 770 S Military Trail, Unit A1, West Palm Beach.",
    'does kava get you drunk': "Kava is not alcohol, so it does not get you drunk like beer, wine, or liquor. It is a traditional botanical beverage made from kava root. Some people may feel different after drinking kava, so we treat it as a responsible-use beverage. Do not mix it with alcohol or other substances.",
    'is kratom alcohol': "No, kratom is not alcohol. It is a botanical tea brewed from tree leaves. However, it should be treated as a responsible-use botanical beverage. Do not mix it with alcohol or other substances.",
    'is kratom 21+': "Yes. All kratom products are strictly for adults 21+ only. A valid government-issued ID is required at the counter.",
    'can i drink kratom every day': "We do not recommend using kratom as a daily habit or using it to self-treat any health condition. Long-term use may not be right for everyone. For health or medication questions, speak with a qualified professional.",
    'what should i order first': "We recommend ordering based on your flavor preferences:\n\n" +
                               "🍨 **If you want sweet and creamy:** Try *Banana Pudding* or *La Nube Tres Leches*.\n" +
                               "🍓 **If you want fruity and refreshing:** Try *Passionfruit Mint* (21+) or *Guava Lime* (no botanicals).\n" +
                               "🌌 **If you want bold:** Try *Blue Razz Coconut*.\n\n" +
                               "Please feel free to ask our baristas at the lounge! They love guiding first-timers.",
    'what is beginner friendly': "For a sweet first kava drink, try *Banana Pudding* or *La Nube Tres Leches*. If you want no kava or kratom, *Guava Lime* is an easy fruit-forward choice. Our team can also walk you through a traditional single shell.",
    'difference between kava and kratom': "Kava and Kratom come from different botanical sources. **Kava** is made from the root of a shrub and has a long history of traditional social use in the Pacific Islands. **Kratom** is brewed from the leaves of a tropical tree native to Southeast Asia and is served as a botanical tea. Kava is available to adults, while Kratom is strictly 21+ only.",
    'do you have drinks without kava or kratom': "Yes! Our fruit drinks include *Guava Lime*, *Watermelon Cucumber Lime*, and *Jamaica Passionfruit*. They contain no kava or kratom.",
    'where are you located': "We are located at **770 S Military Trail, Unit A1, West Palm Beach, FL 33415** — an easy drive from Lake Worth, Greenacres, Palm Springs, and Haverhill. Free open-lot parking with unlimited spaces. Stop by and vibe!",
    'what are your hours': "We are open **Sunday–Thursday 8:00 AM–12:00 AM** and **Friday–Saturday 8:00 AM–1:00 AM**.",
    'parking': "Yes — **unlimited free parking** in the open lot right at the lounge. Pull in, park, and come find Unit A1.",
    'amenities': "We've got **free Wi‑Fi**, **first drink free** (ask our team when you arrive), **unlimited free parking**, **pool tables**, and **multiple seating sections**. A **smoke shop is coming soon**.",
    'wifi': "Yes — **free Wi‑Fi** is available. Perfect for study sessions, remote work, or hanging out. We also have multiple seating sections and pool tables.",
    'first drink free': "Yes — your **first drink is free**. Ask our team when you arrive and they'll hook you up.",
    'pool tables': "Yes — we have **pool tables** so you can shoot a game while you sip.",
    'smoke shop': "A **smoke shop is coming soon** at Tribal Kava Lounge. Follow **@TribalKavaLounge** on Instagram for the drop.",
    'how do i contact you': "Call us at **(561) 355-0561**, email **Join@TribalKavaLounge.Co**, follow **@TribalKavaLounge** on Instagram, or visit **TribalKavaLounge.com**. We're at 770 S Military Trail, Unit A1, West Palm Beach, FL 33415.",
    'do you have events': "Yes! We have **$2 Tuesday shells** from 2–5 PM, recurring **Karaoke**, and **Friday Lotería at 9 PM** hosted by Tony. Game nights, poker, Art Club, and Sip & Paint rotate in — check the Events page and Instagram for current dates.",
    'can i bring friends who have never tried it': "Absolutely! Tribal Kava Lounge is built for first-timers. We serve non-botanical options like fruit drinks, and our team is happy to answer questions at the bar to make everyone feel comfortable.",
    'the daily kava': "Yes — **The Daily Kava** is our blog: beginner guides, lounge stories, and West Palm Beach life with a little humor. Read it on the site under **The Daily Kava**.",
};

// Medical trigger word list to enforce guardrails
const medicalTriggers = [
    'pain', 'anxiety', 'sleep', 'depress', 'stress', 'addict', 'withdraw', 'opioid', 'cure', 
    'treat', 'therapy', 'sedative', 'euphoria', 'dose', 'dosing', 'medical', 'pregnant', 
    'nurse', 'nursing', 'medication', 'disease', 'heal', 'illness', 'health'
];

// Path-based SPA Router (SEO-friendly URLs; Netlify /* → index.html)
const VALID_ROUTES = new Set([
    'home', 'menu', 'new-here', 'kava-vs-kratom', 'events', 'visit', 'faq',
    'event-detail', 'nearby', 'nearby-detail', 'the-daily-kava', 'the-daily-kava-article',
    'what-is-kava', 'what-is-kratom',
    'plan-your-visit', 'private-events', 'press', 'gift-cards',
    'tribal-kava-west-palm-beach'
]);

function parsePathRoute() {
    // Migrate legacy hash URLs: /#/menu → /menu
    if (window.location.hash && window.location.hash.startsWith('#/')) {
        const migrated = window.location.hash.slice(1); // /menu
        history.replaceState(null, '', migrated || '/');
    }

    let path = window.location.pathname || '/';
    // Strip trailing slash except root
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    let route = path === '/' ? 'home' : path.replace(/^\//, '');
    let dailySlug = null;
    let eventSlug = null;
    let nearbySlug = null;

    if (route.startsWith('the-daily-kava/')) {
        dailySlug = route.slice('the-daily-kava/'.length).replace(/\/$/, '');
        route = 'the-daily-kava-article';
    }

    if (route.startsWith('events/')) {
        eventSlug = route.slice('events/'.length).replace(/\/$/, '');
        route = 'event-detail';
    }

    if (route.startsWith('nearby/')) {
        nearbySlug = route.slice('nearby/'.length).replace(/\/$/, '');
        route = 'nearby-detail';
    }

    return { route, dailySlug, eventSlug, nearbySlug, path };
}

function pathForRoute(route, dailySlug) {
    if (route === 'home') return '/';
    if (route === 'the-daily-kava-article' && dailySlug) return `/the-daily-kava/${dailySlug}`;
    return `/${route}`;
}

function navigateTo(path, { replace = false } = {}) {
    if (!path.startsWith('/')) path = '/' + path;
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    handleRoute();
}

function preferredScrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function handleRoute() {
    let { route, dailySlug, eventSlug, nearbySlug } = parsePathRoute();

    document.querySelectorAll('.spa-view').forEach(view => {
        view.style.display = 'none';
    });

    const activeView = document.getElementById(`view-${route}`);
    if (activeView && (VALID_ROUTES.has(route) || route === 'the-daily-kava-article')) {
        activeView.style.display = 'block';
    } else {
        document.getElementById('view-home').style.display = 'block';
        route = 'home';
        dailySlug = null;
        eventSlug = null;
        nearbySlug = null;
        if (window.location.pathname !== '/') {
            history.replaceState(null, '', '/');
        }
    }

    if (route === 'home') {
        renderDailyKavaHomeLatest(3);
        injectSEO('home');
    } else if (route === 'the-daily-kava') {
        renderDailyKavaIndex();
        injectSEO('the-daily-kava');
    } else if (route === 'the-daily-kava-article') {
        const ok = renderDailyKavaArticle(dailySlug);
        if (!ok) {
            navigateTo('/the-daily-kava', { replace: true });
            return;
        }
    } else if (route === 'event-detail') {
        const ok = renderEventDetail(eventSlug);
        if (!ok) {
            navigateTo('/events', { replace: true });
            return;
        }
    } else if (route === 'nearby-detail') {
        const ok = renderNearbyArea(nearbySlug);
        if (!ok) {
            navigateTo('/nearby', { replace: true });
            return;
        }
    } else {
        injectSEO(route);
    }

    // Active nav
    document.querySelectorAll('.nav-menu a, .mobile-nav-links a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isDaily = route === 'the-daily-kava' || route === 'the-daily-kava-article';
        const isNearby = route === 'nearby' || route === 'nearby-detail';
        const matches =
            (route === 'home' && (href === '/' || href === '')) ||
            href === `/${route}` ||
            (isDaily && href === '/the-daily-kava') ||
            (isNearby && href === '/nearby');
        link.classList.toggle('active', !!matches);
    });

    const drawer = document.getElementById('mobile-drawer');
    if (drawer?.open) drawer.close();

    // Deep-link anchors like /#vip after path load
    if (window.location.hash && !window.location.hash.startsWith('#/')) {
        const el = document.getElementById(window.location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: preferredScrollBehavior() });
    } else {
        window.scrollTo(0, 0);
    }

    window.dispatchEvent(new CustomEvent('tribal:navigation', {
        detail: { route, path: window.location.pathname }
    }));
}

function renderEventDetail(slug) {
    const event = eventDatabase[slug];
    const root = document.getElementById('event-detail-root');
    if (!event || !root) return false;

    const external = event.sourceUrl.startsWith('http');
    root.innerHTML = `
        <a class="daily-back" href="/events">← All events</a>
        <p class="event-detail-eyebrow">${event.eyebrow}</p>
        <h1>${event.title}</h1>
        <p class="event-detail-intro">${event.intro}</p>
        <div class="event-detail-card">
            <p>${event.detail}</p>
            <div class="event-detail-actions">
                <a href="${event.sourceUrl}" ${external ? 'target="_blank" rel="noopener"' : ''} class="btn btn-secondary" data-conversion="events_view">${event.sourceLabel}</a>
                <a href="https://www.google.com/maps/dir/?api=1&amp;destination=770+S+Military+Trail+Unit+A1,+West+Palm+Beach,+FL+33415&amp;destination_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y" target="_blank" rel="noopener" class="btn btn-accent" data-conversion="directions">Get Directions</a>
                ${event.calendarUrl ? `<a href="${event.calendarUrl}" download="tribal-weekly-events.ics" class="btn" data-conversion="calendar_download">Add Weekly Calendar</a>` : ''}
                <a href="/#vip" class="btn">Request Event Updates</a>
            </div>
        </div>
        ${event.embedUrl ? `
            <div class="event-proof-card">
                <div>
                    <p class="menu-eyebrow">Verified event proof</p>
                    <h2>${event.proofTitle}</h2>
                    <p>The embedded post is the scheduling source. If its date has passed, use the source link above for the next confirmed night.</p>
                </div>
                <iframe class="instagram-embed" title="${event.proofTitle}" src="${event.embedUrl}" loading="lazy" allowtransparency="true"></iframe>
            </div>
        ` : ''}
    `;
    injectSEO(event.seoKey);
    return true;
}

function renderNearbyArea(slug) {
    const area = nearbyAreaDatabase[slug];
    const root = document.getElementById('nearby-detail-root');
    if (!area || !root) return false;

    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(area.origin)}&destination=770+S+Military+Trail+Unit+A1,+West+Palm+Beach,+FL+33415&destination_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y`;
    const otherAreas = Object.entries(nearbyAreaDatabase)
        .filter(([candidate]) => candidate !== slug)
        .map(([candidate, item]) => `<a href="/nearby/${candidate}">${item.areaName}<span>View local guide →</span></a>`)
        .join('');

    root.innerHTML = `
        <a class="daily-back" href="/nearby">← All nearby areas</a>
        <header class="local-area-hero">
            <p class="menu-eyebrow">${area.eyebrow}</p>
            <h1>${area.title}</h1>
            <p>${area.intro}</p>
        </header>
        <div class="local-truth-strip" role="note">
            <strong>One real location</strong>
            <span>770 S Military Trail, Unit A1, West Palm Beach, FL 33415</span>
        </div>
        <div class="local-guide-layout">
            <article class="local-guide-main">
                <section>
                    <h2>${area.visitTitle}</h2>
                    <p>${area.visitCopy}</p>
                </section>
                <section>
                    <h2>${area.planTitle}</h2>
                    <p>${area.planCopy}</p>
                </section>
                <section>
                    <h2>${area.localTitle}</h2>
                    <p>${area.localCopy}</p>
                </section>
                <section class="local-area-faq" aria-labelledby="local-faq-title">
                    <h2 id="local-faq-title">Quick answers for ${area.areaName}</h2>
                    ${area.faq.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}
                </section>
            </article>
            <aside class="local-guide-rail" aria-label="Plan your Tribal Kava Lounge visit">
                <p class="menu-eyebrow">Plan the visit</p>
                <h2>Open late. Park free.</h2>
                <dl>
                    <div><dt>Sun–Thu</dt><dd>8 AM–12 AM</dd></div>
                    <div><dt>Fri–Sat</dt><dd>8 AM–1 AM</dd></div>
                    <div><dt>Parking</dt><dd>Open lot · free</dd></div>
                    <div><dt>Kratom</dt><dd>21+ · valid ID</dd></div>
                </dl>
                <div class="local-guide-actions">
                    <a href="${directionsUrl}" target="_blank" rel="noopener" class="btn btn-accent" data-conversion="directions">Directions from ${area.areaName}</a>
                    <a href="/menu" class="btn btn-secondary" data-conversion="menu_view">See Menu & Prices</a>
                    <a href="https://www.doordash.com/store/tribal-kava-bar-w.p.b-west-palm-beach-41073365/98494168/?pickup=true" target="_blank" rel="noopener" class="btn" data-conversion="order_online">Order Online</a>
                </div>
            </aside>
        </div>
        <nav class="local-area-links" aria-label="Other nearby area guides">
            <p class="menu-eyebrow">More local guides</p>
            <div>${otherAreas}</div>
        </nav>
    `;
    injectSEO(area.seoKey);
    return true;
}

function getDailyKavaSorted() {
    if (typeof dailyKavaPosts === 'undefined') return [];
    return [...dailyKavaPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function dailyKavaCardHTML(post) {
    return `
        <article class="card daily-card">
            <div class="daily-card-meta">
                <span class="daily-cat">${post.category}</span>
                <span class="daily-date">${formatDailyDate(post.date)} · ${post.readMin} min</span>
            </div>
            <h2 class="daily-card-title"><a href="/the-daily-kava/${post.slug}">${post.title}</a></h2>
            <p class="daily-card-dek">${post.dek}</p>
            <a class="daily-read-link" href="/the-daily-kava/${post.slug}">Read story →</a>
        </article>
    `;
}

function renderDailyKavaIndex() {
    const grid = document.getElementById('daily-kava-grid');
    if (!grid) return;
    grid.innerHTML = getDailyKavaSorted().map(dailyKavaCardHTML).join('');
}

/** Latest posts strip on the home page */
function renderDailyKavaHomeLatest(limit = 3) {
    const grid = document.getElementById('daily-kava-home-latest');
    if (!grid) return;
    grid.innerHTML = getDailyKavaSorted().slice(0, limit).map(dailyKavaCardHTML).join('');
}

function escapeDailyKavaText(value) {
    const el = document.createElement('span');
    el.textContent = value || '';
    return el.innerHTML;
}

function dailyKavaFAQHTML(faq = []) {
    if (!faq.length) return '';

    return `
        <section class="daily-faq" aria-labelledby="daily-faq-heading">
            <h2 id="daily-faq-heading">Quick answers</h2>
            ${faq.map(item => `
                <details>
                    <summary>${escapeDailyKavaText(item.question)}</summary>
                    <p>${escapeDailyKavaText(item.answer)}</p>
                </details>
            `).join('')}
        </section>
    `;
}

function dailyKavaActionsHTML(post) {
    const canonical = `${SITE_ORIGIN}/the-daily-kava/${post.slug}`;
    const sharedUrl = `${canonical}?utm_source=reader_share&utm_medium=referral&utm_campaign=daily_kava`;
    const text = encodeURIComponent(`${post.title} ${sharedUrl}`);
    return `<section class="daily-visit-actions" aria-label="Plan your visit and share this guide">
        <h2>Make it a Tribal night.</h2>
        <p>770 S Military Trail, Unit A1 · West Palm Beach · Free parking</p>
        <div class="daily-action-links">
            <a class="btn btn-accent" href="/menu" data-conversion="menu_view">See Menu &amp; Prices</a>
            <a class="btn btn-secondary" href="https://www.google.com/maps/dir/?api=1&amp;destination=770+S+Military+Trail+Unit+A1,+West+Palm+Beach,+FL+33415&amp;destination_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y" target="_blank" rel="noopener" data-conversion="directions">Get Directions</a>
            <a class="btn btn-secondary" href="/events" data-conversion="events_view">What’s On</a>
            <a class="btn btn-secondary" href="/#vip">Join the Event Email List</a>
        </div>
        <p>Bring someone along: <a href="sms:?body=${text}" data-conversion="article_share_sms">Text this guide</a> · <a href="https://wa.me/?text=${text}" target="_blank" rel="noopener" data-conversion="article_share_whatsapp">Share on WhatsApp</a> · <a href="/feed.xml" data-conversion="rss_feed_open">Follow the RSS feed</a></p>
    </section>`;
}

function renderDailyKavaArticle(slug) {
    const post = typeof getDailyKavaPost === 'function' ? getDailyKavaPost(slug) : null;
    const root = document.getElementById('daily-kava-article-root');
    if (!post || !root) return false;

    root.innerHTML = `
        <a class="daily-back" href="/the-daily-kava">← The Daily Kava</a>
        <div class="daily-card-meta" style="margin-top: 1.25rem;">
            <span class="daily-cat">${post.category}</span>
            <span class="daily-date">${formatDailyDate(post.date)} · ${post.readMin} min read</span>
        </div>
        <h1 class="daily-article-title">${post.title}</h1>
        <p class="daily-article-dek">${post.dek}</p>
        <div class="daily-article-body">${post.body}</div>
        ${dailyKavaFAQHTML(post.faq)}
        ${dailyKavaActionsHTML(post)}
        <div class="daily-article-footer">
            <p>More from <a href="/the-daily-kava">The Daily Kava</a> · <a href="/menu">Menu</a> · <a href="/visit">Visit</a> · <a href="tel:+15613550561">(561) 355-0561</a></p>
            <p class="daily-note" style="margin-top: 1rem;">Kratom products are 21+ only. Valid ID required. Not intended to diagnose, treat, cure, or prevent any disease. Do not mix kava or kratom with alcohol or other substances.</p>
        </div>
    `;

    const articleTitle = post.seoTitle || `${post.title} | The Daily Kava`;
    const articleDescription = post.metaDescription || post.dek;
    const articleUrl = `${SITE_ORIGIN}/the-daily-kava/${post.slug}`;

    document.title = articleTitle;
    let metaDescTag = document.querySelector('meta[name="description"]');
    if (!metaDescTag) {
        metaDescTag = document.createElement('meta');
        metaDescTag.setAttribute('name', 'description');
        document.head.appendChild(metaDescTag);
    }
    metaDescTag.setAttribute('content', articleDescription);

    const canon = document.getElementById('seo-canonical');
    if (canon) canon.setAttribute('href', articleUrl);
    const ogType = document.getElementById('og-type');
    if (ogType) ogType.setAttribute('content', 'article');
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', articleTitle);
    const ogDesc = document.getElementById('og-desc');
    if (ogDesc) ogDesc.setAttribute('content', articleDescription);
    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.setAttribute('content', articleUrl);

    let schemaScript = document.getElementById('seo-json-ld');
    if (schemaScript) schemaScript.remove();
    schemaScript = document.createElement('script');
    schemaScript.id = 'seo-json-ld';
    schemaScript.type = 'application/ld+json';
    const schemaGraph = [{
        "@type": "BlogPosting",
        "headline": post.title,
        "description": articleDescription,
        "datePublished": post.date,
        "dateModified": post.modified || post.date,
        "author": { "@type": "Organization", "name": "Tribal Kava Lounge" },
        "publisher": {
            "@type": "Organization",
            "name": "Tribal Kava Lounge",
            "url": SITE_ORIGIN
        },
        "mainEntityOfPage": articleUrl,
        "url": articleUrl,
        "isPartOf": { "@type": "Blog", "name": "The Daily Kava", "url": `${SITE_ORIGIN}/the-daily-kava` },
        "articleSection": post.category,
        "keywords": (post.keywords || post.tags || []).join(', '),
        "about": [
            { "@type": "Place", "name": "West Palm Beach, Florida" },
            { "@type": "Thing", "name": "Kava lounge" }
        ]
    }];

    if (post.faq && post.faq.length) {
        schemaGraph.push({
            "@type": "FAQPage",
            "mainEntity": post.faq.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": { "@type": "Answer", "text": item.answer }
            }))
        });
    }

    schemaScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": schemaGraph
    }, null, 2);
    document.head.appendChild(schemaScript);

    return true;
}

// SEO Injector
function injectSEO(route) {
    const meta = seoDatabase[route];
    if (!meta) return;
    
    // Set Document Title
    document.title = meta.title;
    
    // Set Meta Description
    let metaDescTag = document.querySelector('meta[name="description"]');
    if (!metaDescTag) {
        metaDescTag = document.createElement('meta');
        metaDescTag.setAttribute('name', 'description');
        document.head.appendChild(metaDescTag);
    }
    metaDescTag.setAttribute('content', meta.description);
    
    // Inject/Replace Schema Script
    let schemaScript = document.getElementById('seo-json-ld');
    if (schemaScript) {
        schemaScript.remove();
    }
    schemaScript = document.createElement('script');
    schemaScript.id = 'seo-json-ld';
    schemaScript.type = 'application/ld+json';
    schemaScript.text = JSON.stringify(meta.schema, null, 2);
    document.head.appendChild(schemaScript);
    
    // Canonical + Open Graph
    const absUrl = SITE_ORIGIN + (meta.slug === '/' ? '/' : meta.slug);
    const canon = document.getElementById('seo-canonical');
    if (canon) canon.setAttribute('href', absUrl);
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const ogDesc = document.getElementById('og-desc');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);
    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.setAttribute('content', absUrl);
    const ogType = document.getElementById('og-type');
    if (ogType) ogType.setAttribute('content', 'website');
}

// AI Assistant Response Logic
function generateBotResponse(userInput) {
    const cleanedInput = userInput.toLowerCase().trim();
    
    // 1. Guardrail triggers checks (Medical/Health questions)
    const isMedical = medicalTriggers.some(word => cleanedInput.includes(word));
    if (isMedical) {
        return aiKnowledgeBase.safetyDisclaimer;
    }
    
    // 2. Direct keyword mapping
    if (cleanedInput.includes('kava') && cleanedInput.includes('kratom') && cleanedInput.includes('difference')) {
        return aiKnowledgeBase['difference between kava and kratom'];
    }
    if (cleanedInput.includes('get you drunk') || cleanedInput.includes('drunk') || cleanedInput.includes('buzz')) {
        return aiKnowledgeBase['does kava get you drunk'];
    }
    if (cleanedInput.includes('is kratom alcohol') || (cleanedInput.includes('kratom') && cleanedInput.includes('alcohol'))) {
        return aiKnowledgeBase['is kratom alcohol'];
    }
    if (cleanedInput.includes('kratom') && (cleanedInput.includes('every day') || cleanedInput.includes('daily') || cleanedInput.includes('how often'))) {
        return aiKnowledgeBase['can i drink kratom every day'];
    }
    if (cleanedInput.includes('extract') || cleanedInput.includes('shot')) {
        return aiKnowledgeBase['do you have kratom extracts or shots'];
    }
    if (cleanedInput.includes('order online') || cleanedInput.includes('online order') || cleanedInput.includes('delivery') || cleanedInput.includes('gift card')) {
        return aiKnowledgeBase['online ordering'];
    }
    if (cleanedInput.includes('what should i order') || cleanedInput.includes('recommend') || (cleanedInput.includes('menu') && !cleanedInput.includes('price'))) {
        return aiKnowledgeBase['what should i order first'];
    }
    if (cleanedInput.includes('beginner') || cleanedInput.includes('first time') || cleanedInput.includes('new here')) {
        return aiKnowledgeBase['what is beginner friendly'];
    }
    if (cleanedInput.includes('without kava') || cleanedInput.includes('non-botanical') || cleanedInput.includes('no kava')) {
        return aiKnowledgeBase['do you have drinks without kava or kratom'];
    }
    if (cleanedInput.includes('21+') || cleanedInput.includes('age') || cleanedInput.includes('id')) {
        return aiKnowledgeBase['is kratom 21+'];
    }
    if (cleanedInput.includes('parking') || cleanedInput.includes('park')) {
        return aiKnowledgeBase['parking'];
    }
    if (cleanedInput.includes('wifi') || cleanedInput.includes('wi-fi') || cleanedInput.includes('wi fi') || cleanedInput.includes('internet')) {
        return aiKnowledgeBase['wifi'];
    }
    if (cleanedInput.includes('first drink') || cleanedInput.includes('free drink') || cleanedInput.includes('complimentary')) {
        return aiKnowledgeBase['first drink free'];
    }
    if (cleanedInput.includes('hours') || cleanedInput.includes('open') || cleanedInput.includes('close')) {
        return aiKnowledgeBase['what are your hours'];
    }
    if (cleanedInput.includes('2 dollar') || cleanedInput.includes('$2') || cleanedInput.includes('two dollar') || (cleanedInput.includes('tuesday') && (cleanedInput.includes('shell') || cleanedInput.includes('$') || cleanedInput.includes('deal') || cleanedInput.includes('special') || cleanedInput.includes('promo')))) {
        return aiKnowledgeBase['two dollar tuesday'];
    }
    if (cleanedInput.includes('tuesday')) {
        return aiKnowledgeBase['two dollar tuesday'];
    }
    if (cleanedInput.includes('price') || cleanedInput.includes('how much') || cleanedInput.includes('cost') || cleanedInput.includes('pricing')) {
        return aiKnowledgeBase['menu prices'];
    }
    if (cleanedInput.includes('karaoke') || cleanedInput.includes('karokee') || cleanedInput.includes('wednesday')) {
        return aiKnowledgeBase['karaoke'];
    }
    if (cleanedInput.includes('tournament') || cleanedInput.includes('thursday')) {
        return aiKnowledgeBase['pool tournament'];
    }
    if (cleanedInput.includes('loteria') || cleanedInput.includes('lotería') || cleanedInput.includes('friday')) {
        return aiKnowledgeBase['loteria'];
    }
    if ((cleanedInput.includes('red') || cleanedInput.includes('white') || cleanedInput.includes('green') || cleanedInput.includes('strain')) && cleanedInput.includes('kratom')) {
        return aiKnowledgeBase['kratom tea strains'];
    }
    if (cleanedInput.includes('pool') || cleanedInput.includes('billiard')) {
        return aiKnowledgeBase['pool tables'];
    }
    if (cleanedInput.includes('smoke shop') || cleanedInput.includes('smoke') || cleanedInput.includes('vape')) {
        return aiKnowledgeBase['smoke shop'];
    }
    if (cleanedInput.includes('amenities') || cleanedInput.includes('what do you have') || cleanedInput.includes('facilities') || cleanedInput.includes('seating')) {
        return aiKnowledgeBase['amenities'];
    }
    if (cleanedInput.includes('email') || cleanedInput.includes('contact') || cleanedInput.includes('instagram') || cleanedInput.includes('website') || cleanedInput.includes('phone') || cleanedInput.includes('call') || cleanedInput.includes('561')) {
        return aiKnowledgeBase['how do i contact you'];
    }
    if (cleanedInput.includes('location') || cleanedInput.includes('where') || cleanedInput.includes('address')) {
        return aiKnowledgeBase['where are you located'];
    }
    if (cleanedInput.includes('daily kava') || cleanedInput.includes('blog') || cleanedInput.includes('article')) {
        return aiKnowledgeBase['the daily kava'];
    }
    if (cleanedInput.includes('event') || cleanedInput.includes('open mic') || cleanedInput.includes('happen') || cleanedInput.includes('weekly')) {
        return aiKnowledgeBase['do you have events'];
    }
    if (cleanedInput.includes('friend') || cleanedInput.includes('bring')) {
        return aiKnowledgeBase['can i bring friends who have never tried it'];
    }
    if (cleanedInput.includes('what is kava') || cleanedInput.includes('explain kava')) {
        return aiKnowledgeBase['what is kava'];
    }
    if (cleanedInput.includes('what is kratom') || cleanedInput.includes('explain kratom')) {
        return aiKnowledgeBase['what is kratom'];
    }
    
    // 3. Benefits / effects general question checks
    if (cleanedInput.includes('benefit') || cleanedInput.includes('good for') || cleanedInput.includes('why drink')) {
        return aiKnowledgeBase.benefitsDisclaimer;
    }
    if (cleanedInput.includes('feel') || cleanedInput.includes('effect') || cleanedInput.includes('what does it do')) {
        return aiKnowledgeBase.effectsDisclaimer;
    }
    
    // 4. Default fallback
    return "I would love to help you with that! Tribal Kava Lounge serves traditional kava shells, brewed kratom tea, crafted drinks, and fruit drinks in an alcohol-free lounge. For a first order, try Banana Pudding or Guava Lime, or ask our team to walk you through a traditional shell. You can also ask me 'What is kava?' or 'Where are you located?'";
}

// Append Chat Messages
function appendMessage(sender, text, targetChatElementId) {
    const chatContainer = document.getElementById(targetChatElementId);
    if (!chatContainer) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender);
    msgDiv.textContent = sender === 'bot' ? text.replace(/\*\*/g, '').replace(/\*/g, '') : text;
    chatContainer.appendChild(msgDiv);
    
    // Auto Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Handle sending messages (floating widget or embedded)
function sendMessage(inputElementId, targetChatElementId) {
    const inputField = document.getElementById(inputElementId);
    if (!inputField) return;
    
    const userText = inputField.value.trim();
    if (!userText) return;
    
    // User message
    appendMessage('user', userText, targetChatElementId);
    inputField.value = '';
    
    // Bot Typing Effect
    setTimeout(() => {
        const botResponse = generateBotResponse(userText);
        appendMessage('bot', botResponse, targetChatElementId);
    }, 600);
}

function revealFloatingChat(showPrompt = false) {
    const bubble = document.getElementById('floating-chat-bubble');
    if (!bubble) return;

    bubble.hidden = false;
    window.requestAnimationFrame(() => {
        bubble.classList.add('is-ready');
        if (showPrompt) bubble.classList.add('show-prompt');
    });
}

function setFloatingChatOpen(shouldOpen, focusInput = false) {
    const bubble = document.getElementById('floating-chat-bubble');
    const chatWindow = document.getElementById('floating-chat-window');
    if (!bubble || !chatWindow) return;

    if (shouldOpen) revealFloatingChat();
    bubble.classList.remove('show-prompt');
    bubble.setAttribute('aria-expanded', String(shouldOpen));

    if (shouldOpen) {
        chatWindow.hidden = false;
        window.requestAnimationFrame(() => chatWindow.classList.add('open'));
        if (focusInput) {
            window.setTimeout(() => document.getElementById('float-chat-input')?.focus(), 80);
        }
        return;
    }

    chatWindow.classList.remove('open');
    chatWindow.hidden = true;
}

function updateBusinessStatus() {
    const status = document.getElementById('business-open-status');
    if (!status) return;

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const minutes = (Number(values.hour) * 60) + Number(values.minute);
    const lateSpill = minutes < 60 && (values.weekday === 'Saturday' || values.weekday === 'Sunday');
    const daytimeOpen = minutes >= 480;
    const isOpen = daytimeOpen || lateSpill;
    const closesAtOne = lateSpill || (daytimeOpen && (values.weekday === 'Friday' || values.weekday === 'Saturday'));

    status.textContent = isOpen
        ? `Open now · Closes ${closesAtOne ? '1 AM' : 'at midnight'}`
        : 'Closed · Opens at 8 AM';
    status.classList.toggle('is-open', isOpen);
    status.classList.toggle('is-closed', !isOpen);
}

let activeSocialProof = null;

function socialProofDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York'
    }).format(date);
}

function trustedInstagramUrl(value) {
    try {
        const url = new URL(value, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith('/images/')) return url.href;
        if (url.protocol !== 'https:') return '';
        const hosts = ['instagram.com', 'cdninstagram.com', 'fbcdn.net'];
        return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : '';
    } catch (_) {
        return '';
    }
}

function applyGoogleRatingToSchema(google) {
    const schemaScript = document.getElementById('seo-json-ld');
    if (!schemaScript) return;
    try {
        const schema = JSON.parse(schemaScript.textContent);
        const nodes = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
        const business = nodes.find((node) => {
            const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
            return types.includes('LocalBusiness');
        });
        if (!business) return;
        business.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: String(google.rating),
            reviewCount: String(google.reviewCount)
        };
        schemaScript.textContent = JSON.stringify(schema, null, 2);
    } catch (_) {
        // Keep the route's original valid schema if third-party data is malformed.
    }
}

function renderInstagramGallery(instagram, providerStatus) {
    const gallery = document.getElementById('instagram-gallery');
    const status = document.getElementById('instagram-gallery-status');
    if (!gallery || !status || !Array.isArray(instagram?.items)) return;

    const safeItems = instagram.items.map((item) => ({
        imageUrl: trustedInstagramUrl(item.imageUrl),
        permalink: trustedInstagramUrl(item.permalink),
        alt: String(item.alt || 'From @TribalKavaLounge').slice(0, 180),
        caption: String(item.caption || 'From @TribalKavaLounge').replace(/\s+/g, ' ').slice(0, 90)
    })).filter((item) => item.imageUrl && item.permalink).slice(0, 6);

    if (providerStatus !== 'live' || !safeItems.length) return;
    gallery.replaceChildren(...safeItems.map((item) => {
        const link = document.createElement('a');
        link.className = 'owned-media-card';
        link.href = item.permalink;
        link.target = '_blank';
        link.rel = 'noopener';
        link.dataset.conversion = 'instagram';

        const image = document.createElement('img');
        image.src = item.imageUrl;
        image.alt = item.alt;
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';

        const label = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = 'From @TribalKavaLounge';
        const caption = document.createElement('small');
        caption.textContent = item.caption;
        label.append(title, caption);
        link.append(image, label);
        return link;
    }));
    gallery.classList.add('is-live');
    const refreshed = socialProofDate(instagram.checkedAt);
    status.textContent = `Curated Instagram media refreshed automatically${refreshed ? ` · ${refreshed}` : ''}.`;
}

function applySocialProof(payload) {
    const rating = Number(payload?.google?.rating);
    const reviewCount = Number(payload?.google?.reviewCount);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isInteger(reviewCount) || reviewCount < 0) return;

    const formattedRating = rating.toFixed(1);
    document.querySelectorAll('[data-google-rating-summary]').forEach((node) => {
        node.textContent = `${formattedRating} stars from ${reviewCount.toLocaleString('en-US')} Google reviews`;
    });
    document.querySelectorAll('[data-google-rating-value]').forEach((node) => { node.textContent = formattedRating; });
    document.querySelectorAll('[data-google-review-count]').forEach((node) => { node.textContent = reviewCount.toLocaleString('en-US'); });
    document.querySelectorAll('[data-google-rating-stars]').forEach((node) => {
        node.setAttribute('aria-label', `${formattedRating} out of 5 stars`);
    });

    const googleLive = payload?.providerStatus?.google === 'live';
    const refreshed = socialProofDate(payload?.google?.checkedAt);
    document.querySelectorAll('[data-social-proof-note]').forEach((node) => {
        node.textContent = googleLive
            ? `Google rating and review count refreshed automatically${refreshed ? ` · ${refreshed}` : ''}. Review excerpts remain a curated editorial selection.`
            : 'Showing the Google rating snapshot checked August 31, 2026. Open Google for the current live listing.';
    });

    // Keep the dated editorial snapshot visible, but never present it as live schema data.
    if (googleLive) applyGoogleRatingToSchema(payload.google);
    renderInstagramGallery(payload.instagram, payload?.providerStatus?.instagram);
}

async function refreshSocialProof() {
    try {
        const response = await fetch('/api/social-proof', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
        });
        if (!response.ok) return;
        const payload = await response.json();
        activeSocialProof = payload;
        applySocialProof(payload);
    } catch (_) {
        // The dated, visibly labeled HTML snapshots remain available offline.
    }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Router Init — path-based + intercept in-app links
    window.addEventListener('popstate', handleRoute);
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
        if (e.defaultPrevented || e.button !== 0 || a.hasAttribute('download') || (a.target && a.target !== '_self') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // Internal path navigation
        if (href.startsWith('/')) {
            // Only application routes belong to the SPA. Let the browser open files.
            const targetUrl = new URL(href, window.location.href);
            if (targetUrl.origin !== window.location.origin) return;
            const pathname = targetUrl.pathname.replace(/\/$/, '') || '/';
            const route = pathname === '/' ? 'home' : pathname.slice(1);
            if (!VALID_ROUTES.has(route) && !/^\/(events|nearby|the-daily-kava)\/[^/.]+$/.test(pathname)) return;
            e.preventDefault();
            // Keep category and signup anchors in history; handleRoute scrolls to them.
            navigateTo(href);
        }
    });
    handleRoute();
    hydrateRecurringEventDates();
    refreshSocialProof();
    window.addEventListener('tribal:navigation', () => {
        if (activeSocialProof) applyGoogleRatingToSchema(activeSocialProof.google);
    });
    
    // A modal dialog provides focus containment, Escape dismissal, and focus return.
    const hamburger = document.getElementById('nav-toggle');
    const drawer = document.getElementById('mobile-drawer');
    if (hamburger && drawer) {
        hamburger.addEventListener('click', () => {
            drawer.showModal();
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.classList.add('mobile-nav-open');
        });
        document.getElementById('nav-close')?.addEventListener('click', () => drawer.close());
        drawer.addEventListener('close', () => {
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('mobile-nav-open');
        });
        const desktopNav = window.matchMedia('(min-width: 1101px)');
        desktopNav.addEventListener('change', (event) => {
            if (event.matches && drawer.open) drawer.close();
        });
    }

    // Reserve the dock's actual height, including safe-area and enlarged text.
    const conversionDock = document.querySelector('.mobile-conversion-dock');
    if (conversionDock && 'ResizeObserver' in window) {
        const dockObserver = new ResizeObserver(() => {
            const height = conversionDock.getBoundingClientRect().height;
            if (height > 0) document.documentElement.style.setProperty('--conversion-dock-space', `${Math.ceil(height)}px`);
        });
        dockObserver.observe(conversionDock);
    }
    
    // Floating Chat Bubble Toggle
    const bubble = document.getElementById('floating-chat-bubble');
    const chatWindow = document.getElementById('floating-chat-window');
    if (bubble && chatWindow) {
        bubble.addEventListener('click', () => {
            const shouldOpen = bubble.getAttribute('aria-expanded') !== 'true';
            setFloatingChatOpen(shouldOpen, shouldOpen);
        });
        
        // Keep the conversion hero clear. Reveal the same guide on every screen
        // size once the visitor moves beyond the hero, or after a patient delay.
        const hero = document.querySelector('.pro-hero');
        if (hero && 'IntersectionObserver' in window) {
            const heroObserver = new IntersectionObserver(([entry]) => {
                if (entry.intersectionRatio >= 0.18) return;
                revealFloatingChat();
                heroObserver.disconnect();
            }, { threshold: [0, 0.18] });
            heroObserver.observe(hero);
        } else {
            window.addEventListener('scroll', () => revealFloatingChat(), { once: true, passive: true });
        }

        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        setTimeout(() => {
            if (chatWindow.hidden) {
                revealFloatingChat(true);
                window.setTimeout(() => bubble.classList.remove('show-prompt'), 7000);
            }
        }, isMobileViewport ? 25000 : 30000);
    }
    
    const chatClose = document.getElementById('chat-close-btn');
    if (chatClose && chatWindow) {
        chatClose.addEventListener('click', (e) => {
            e.stopPropagation();
            setFloatingChatOpen(false);
            bubble?.focus();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && chatWindow && !chatWindow.hidden) {
            setFloatingChatOpen(false);
            bubble?.focus();
        }
    });

    updateBusinessStatus();
    window.setInterval(updateBusinessStatus, 60000);
    
    // Set up send buttons & inputs for both chat interfaces
    const floatSend = document.getElementById('float-chat-send');
    const floatInput = document.getElementById('float-chat-input');
    if (floatSend && floatInput) {
        floatSend.addEventListener('click', () => sendMessage('float-chat-input', 'float-chat-messages'));
        floatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage('float-chat-input', 'float-chat-messages');
        });
    }

    const embedSend = document.getElementById('embed-chat-send');
    const embedInput = document.getElementById('embed-chat-input');
    if (embedSend && embedInput) {
        embedSend.addEventListener('click', () => sendMessage('embed-chat-input', 'embed-chat-messages'));
        embedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage('embed-chat-input', 'embed-chat-messages');
        });
    }
    
    // Accordion FAQ triggers
    document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.closest('.accordion-item');
            const isActive = item.classList.contains('active');
            
            // Close all
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
            
            // Open clicked
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
    
    // Three-question drink finder. Kava and kratom recommendations map to exact
    // builds on the verified DoorDash pickup menu; non-botanical picks remain
    // clearly identified as in-lounge items.
    const drinkFinder = document.getElementById('drink-finder');
    if (drinkFinder) {
        const recommendations = {
            kava: {
                creamy: {
                    first: ['Single Shell · French Vanilla', '$6.24 on DoorDash', 'A traditional kava shell softened with the required French Vanilla syrup and no extra flavor. This exact build is available for pickup.', true],
                    regular: ['Double Shell · Brown Cinnamon Sugar + Horchata', '$10.40 on DoorDash', 'A two-shell kava pour with Brown Cinnamon Sugar syrup and one optional Horchata flavor.', true],
                    bold: ['Double Shell · Hazelnut + Tiger’s Blood', '$10.40 on DoorDash', 'A two-shell kava pour with Hazelnut syrup and a bright Tiger’s Blood flavor.', true]
                },
                fruity: {
                    first: ['Single Shell · French Vanilla + Strawberry', '$6.24 on DoorDash', 'A single kava shell with French Vanilla syrup and one optional Strawberry flavor.', true],
                    regular: ['Double Shell · None + Passion Mango', '$10.40 on DoorDash', 'A two-shell kava pour with no syrup flavor and a bright Passion Mango addition.', true],
                    bold: ['Double Shell · None + Tiger’s Blood', '$10.40 on DoorDash', 'A two-shell kava pour with no syrup flavor and the bolder Tiger’s Blood addition.', true]
                },
                classic: {
                    first: ['Single Shell · None', '$6.24 on DoorDash', 'The direct online kava order: one shell, required syrup choice set to None, and no optional flavor.', true],
                    regular: ['Double Shell · None', '$10.40 on DoorDash', 'A two-shell kava pour with the required syrup choice set to None and no optional flavor.', true],
                    bold: ['Double Shell · Brown Cinnamon Sugar', '$10.40 on DoorDash', 'A two-shell kava pour with Brown Cinnamon Sugar syrup and no extra flavor.', true]
                }
            },
            kratom: {
                creamy: {
                    first: ['Hot Tea · Red · Small + Horchata', '$7.27 on DoorDash', 'A small hot botanical tea with red leaf and Horchata flavor. Kratom is 21+ and valid ID is required.', true],
                    regular: ['Iced Tea · Red · Large + Horchata', '$12.42 on DoorDash', 'A large iced botanical tea with red leaf and Horchata flavor. Kratom is 21+ and valid ID is required.', true],
                    bold: ['Iced Tea · White · Large + Piña Colada', '$12.42 on DoorDash', 'A large iced botanical tea with white leaf and Piña Colada flavor. Kratom is 21+ and valid ID is required.', true]
                },
                fruity: {
                    first: ['Iced Tea · Red · Large + Strawberry', '$12.42 on DoorDash', 'A DoorDash popular build with red leaf, large size, and Strawberry. Kratom is 21+ and valid ID is required.', true],
                    regular: ['Iced Tea · Red · Large + Watermelon', '$12.42 on DoorDash', 'A DoorDash popular build with red leaf, large size, and Watermelon. Kratom is 21+ and valid ID is required.', true],
                    bold: ['Iced Tea · Green · Large + Passion Mango', '$12.42 on DoorDash', 'A DoorDash popular build with green leaf, large size, and Passion Mango. Kratom is 21+ and valid ID is required.', true]
                },
                classic: {
                    first: ['Hot Tea · Red · Small', '$7.27 on DoorDash', 'A small hot botanical tea with red leaf and no optional flavor or boost. Kratom is 21+ and valid ID is required.', true],
                    regular: ['Iced Tea · Red · Large', '$12.42 on DoorDash', 'A large iced botanical tea with red leaf and no optional flavor or boost. Kratom is 21+ and valid ID is required.', true],
                    bold: ['Iced Tea · White · Large + Tiger’s Blood', '$12.42 on DoorDash', 'A large iced botanical tea with white leaf and Tiger’s Blood flavor. Kratom is 21+ and valid ID is required.', true]
                }
            },
            none: {
                creamy: {
                    first: ['Guava Lime', '$13 in-lounge', 'Pink guava and fresh key lime with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    regular: ['Watermelon Cucumber Lime', '$13 in-lounge', 'Watermelon, cucumber, and lime with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    bold: ['Jamaica Passionfruit', '$13 in-lounge', 'Hibiscus tea and tropical passionfruit with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false]
                },
                fruity: {
                    first: ['Guava Lime', '$13 in-lounge', 'Pink guava and fresh key lime with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    regular: ['Watermelon Cucumber Lime', '$13 in-lounge', 'Watermelon, cucumber, and lime with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    bold: ['Jamaica Passionfruit', '$13 in-lounge', 'Hibiscus tea and tropical passionfruit with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false]
                },
                classic: {
                    first: ['Guava Lime', '$13 in-lounge', 'A clean fruit-forward first order with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    regular: ['Watermelon Cucumber Lime', '$13 in-lounge', 'A crisp familiar combination with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false],
                    bold: ['Jamaica Passionfruit', '$13 in-lounge', 'A bright hibiscus and passionfruit signature with no kava or kratom. This one is currently listed on the in-lounge menu, not DoorDash.', false]
                }
            }
        };

        drinkFinder.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(drinkFinder);
            const botanical = formData.get('botanical');
            const flavor = formData.get('flavor');
            const vibe = formData.get('vibe');
            const error = document.getElementById('drink-finder-error');

            if (!botanical || !flavor || !vibe) {
                error.hidden = false;
                drinkFinder.querySelector('input:invalid')?.focus();
                return;
            }

            error.hidden = true;
            const [name, price, description, availableOnline] = recommendations[botanical][flavor][vibe];
            document.getElementById('drink-finder-result-name').textContent = name;
            document.getElementById('drink-finder-result-price').textContent = price;
            document.getElementById('drink-finder-result-description').textContent = description;
            const primaryAction = document.getElementById('drink-finder-primary-action');
            if (availableOnline) {
                primaryAction.href = 'https://www.doordash.com/store/tribal-kava-bar-w.p.b-west-palm-beach-41073365/98494168/?pickup=true';
                primaryAction.textContent = 'Order this on DoorDash';
                primaryAction.target = '_blank';
                primaryAction.rel = 'noopener';
                primaryAction.dataset.conversion = 'order_online';
            } else {
                primaryAction.href = '/menu#clean-menu-fruit';
                primaryAction.textContent = 'See in-lounge fruit drinks';
                primaryAction.removeAttribute('target');
                primaryAction.removeAttribute('rel');
                primaryAction.dataset.conversion = 'menu_view';
            }
            const result = document.getElementById('drink-finder-result');
            result.hidden = false;
            result.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'nearest' });
            window.tribalTrack?.('drink_recommendation', {
                botanical,
                flavor,
                vibe,
                recommended_item: name,
                recommended_price: price,
                available_online: availableOnline
            });
        });
    }
    
    // Coming Soon overlay dismiss
    const comingSoonOverlay = document.getElementById('coming-soon-overlay');
    const previewBtn = document.getElementById('coming-soon-preview');
    if (comingSoonOverlay && previewBtn) {
        previewBtn.addEventListener('click', () => {
            comingSoonOverlay.classList.add('hidden');
        });
    }
});

// Global helpers to handle starter questions in chat
window.askAI = function(questionText, targetInputId, targetSendId) {
    const input = document.getElementById(targetInputId);
    const sendBtn = document.getElementById(targetSendId);
    if (input && sendBtn) {
        if (targetInputId === 'float-chat-input') {
            setFloatingChatOpen(true);
        }
        input.value = questionText;
        sendBtn.click();
    }
};
