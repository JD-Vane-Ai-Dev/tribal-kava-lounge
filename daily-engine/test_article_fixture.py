"""A complete manuscript fixture; production text, isolated metadata and dates."""
import json
from datetime import datetime, timezone
from pathlib import Path
from compliance import parse_article

SOURCE = Path(__file__).parent / 'drafts/first-time-kava-lounge-faq.md'

def article(slug='test-kava-article', title='Kava culture brings a community together', url='https://example.com/kava-culture'):
    metadata, body = parse_article(SOURCE.read_text())
    body = body.replace(metadata['title'], title)
    metadata.update(slug=slug, title=title, seoTitle=title, date=datetime.now(timezone.utc).date().isoformat(), modified=datetime.now(timezone.utc).date().isoformat(), primaryKeyword='test kava article')
    metadata['sources'] = [{'url': url, 'title': 'A documented source', 'verifiedAt': metadata['date'], 'supports': 'Background for the article fixture'}]
    body += '\n\n[Documented source](' + url + ')\n'
    return encode(metadata,body)

def encode(metadata, body):
    return '---\n'+json.dumps(metadata,ensure_ascii=False,indent=2)+'\n---\n'+body
