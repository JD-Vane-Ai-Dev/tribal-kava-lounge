# The Daily Kava: original on-site editorial

Owner direction, September 9, 2026: mostly evergreen, SEO-heavy original articles
about **both kava and kratom**: explainers, culture, history, humor, useful actual
first visits, menu literacy, social life, preparation context, and flavor.
Kratom is a full editorial subject, not a flavor-only category. Flavor is one
lane, not the definition of the kratom coverage.

## What to write

Start with a reader's question, then read the sources needed to answer it.
Write a complete original article that is useful without following an outbound
link. Headlines and RSS snippets are discovery inputs only. Do not publish an
outbound reading list or disguise one by removing its links.

Rotate between kava and kratom and between these article types:

- Evergreen explainers: botanical identity, terminology, tea formats, preparation
  context, and how the menu works. Keep existing core explainers as canonical
  targets; a narrower question needs a distinct answer to justify another URL.
- Culture and history: investigate original cultural sources, museums, local
  writers and community accounts. Do not flatten distinct Pacific or Southeast
  Asian traditions into a generic lounge story.
- Real first visits: use public Reddit, Threads, blogs, or interviews as leads.
  Read the full account. It must describe an actual visit/experience at a kava
  bar, not just preparing kava at home. Attribute it visibly and link the direct
  account. Explain useful takeaways in Tribal's own voice. Do not invent quotes,
  customers, dialogue, feelings, visits to Tribal, or first-person experiences.
  A story about a different bar must say so. Do not turn anecdotes into promises.
- Humor and everyday culture: original observations about ordering, group chats,
  lounge etiquette and hanging out. Label hypothetical scenes naturally; never
  present them as customer testimony. Respect the cultures behind the drinks.
- Practical visits: menu questions, solo visits, games, conversation, and choosing
  a lounge. Specific Tribal facts come from current owned pages or verified staff
  input. Check rotating event dates. Do not invent recurring nights or prices.
- Flavor and preparation: useful, positive ideas for enjoying the drink. Avoid
  disparaging taste framing. Do not drift into dosing or intensity advice.

Retain the existing exclusions: regulation, bills, laws, politics, 7-OH, scare
stories, alcohol promotion, medical claims and guaranteed effects. Do not claim
that botanical drinks are harmless. The established responsible-use footer stays.
These are editorial exclusions, not permission to misstate any factual answer.

## Search and writing standard

1. Inspect the catalog and static core pages for an existing answer first.
2. Select one primary query and a concrete audience question. No invented search
   volumes, ranking promises, keyword stuffing or duplicate city pages.
3. Answer the main question in the opening paragraph. Add specific, useful
   sections, descriptive headings, and two or more concise FAQs where useful.
4. Usually write 600–1,000 words. The 450-word gate catches thin content; it is
   not a target to pad. A number does not prove quality or originality.
5. Link the relevant core explainer, related articles, and a natural menu/visit
   next step. Use an evergreen slug; preserve existing URLs on substantive edits.
6. Use a clear title, SEO title, unique description, category, primary keyword,
   and accurate publication/modified dates. The renderer creates matching
   visible FAQs, BlogPosting metadata, canonical URL, RSS and sitemap entries.
7. Put citations next to reported claims where needed, plus source links at the
   end. Sources support an article; they are not its destination or main content.
8. Read every external source. Save concise evidence notes: URL, source title,
   checked date and exactly what it supports. Do not copy article passages or
   images. A source timestamp field is an editorial record, not automatic proof.

## Voice

Follow [WRITER-VOICE.md](WRITER-VOICE.md): a knowledgeable lounge regular who is
warm, down to earth, useful, and naturally funny. Answer the question early, use
ordinary language, and let a little observational humor fit the subject. Avoid
corporate filler, forced slang, repetitive hooks, and jokes at a newcomer's or
culture's expense. Search terms should fit naturally into a helpful article.
Human-sounding writing never means fabricated visits, quotes, sensory tests, or
customer stories. Kratom gets the same editorial range and care as kava.

## Production contract

A manuscript is UTF-8 Markdown with JSON front matter between `---` lines.
Use a current file in `drafts/` as the schema example. Metadata and body are
hashed together. Do not put private research notes or credentials in either.
Required metadata: contentFormat=original-article, slug, title, seoTitle,
metaDescription, dek, date, modified, category, primaryKeyword, tags, keywords,
faq, storyType, sources. The slug must equal the filename without `.md`.

Each source has `url`, `title`, `verifiedAt`, `supports`. `sources` is the exact
ordered source URL list used in the queue. Evergreen references do not have a
14-day expiry. Recheck facts that can change whenever updating or authoring.

For `storyType=reported-experience`, include `experienceEvidence` with
`kind=actual-kava-bar-visit`, `url`, `attribution`, and `visitEvidence`. The
attribution must appear in the body. A first-visit how-to is `guide` and must not
claim to be a reported experience. Unsupported stories stay in research, not in
publishable drafts.

Add complete manuscripts to `manuscripts/`. The existing daily job copies one
unused manuscript to `drafts/`, checks it, and records it in `state/queue.json`.
When `TRIBAL_WRITER_ENABLED=1` and inventory is empty, the connected Azure writer
selects a distinct `writer-ready` brief from `topic-plan.json`, reads every supplied
source in full, writes a complete article, edits for the voice brief, and reviews
the final text against the same evidence. Other briefs remain in research.
There is no outbound headline template or unsourced model-memory fallback.
See `WRITER.md` for connection settings, limits, failure behavior and activation.
A writer review is bound to the exact metadata and body; editing either requires
a fresh review. Model review supplements the existing deterministic checks and
does not prove factual accuracy or originality.

Passing manuscripts publish automatically through the existing Azure workflow.
Flagged manuscripts stay held. Do not bypass checks, mark staged work published,
or clear withdrawal history. A post is acknowledged only after exact production
catalog verification. Previously withdrawn digests cannot reappear on retry.
