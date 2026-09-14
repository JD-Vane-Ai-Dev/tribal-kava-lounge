"""Verify writer failures cannot publish or spend again during job retries."""
import io
import json
import os
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import compliance
import run_daily
import writer
from test_article_fixture import article, encode


class WriterPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'daily-engine'
        self.root.mkdir()
        (self.root / 'drafts').mkdir()
        (self.root / 'manuscripts').mkdir()
        (self.root / 'EDITORIAL.md').write_text('Editorial test brief')
        (self.root / 'WRITER-VOICE.md').write_text('Natural, helpful, gently funny')
        (self.root.parent / 'daily-kava.js').write_text('const dailyKavaPosts = [];')
        self.url = 'https://example.com/kava-culture'
        self.topic = {'title': 'A useful kava guide', 'subject': 'kava', 'slug': 'test-kava-article',
                      'status': 'writer-ready', 'primaryKeyword': 'test kava article', 'storyType': 'guide',
                      'sources': [{'url': self.url, 'supports': 'How to prepare for a visit'}]}
        (self.root / 'topic-plan.json').write_text(json.dumps({'topics': [self.topic]}))
        self.source = {'url': self.url, 'title': 'A documented source', 'supports': 'Visit context',
                       'verifiedAt': datetime.now(timezone.utc).date().isoformat(), 'sha256': 'a' * 64,
                       'text': 'This is exact evidence about a real lounge menu and a first visit.'}
        meta, body = compliance.parse_article(article())
        self.payload = {'metadata': meta, 'body': body,
                        'sourceNotes': [{'url': self.url, 'supports': 'First-visit context',
                                         'evidenceQuote': 'This is exact evidence about a real lounge menu'}]}
        self.review = {'pass': True, 'issues': [], 'checks': {key: True for key in
                       ('grounded', 'original', 'distinctIntent', 'voice', 'editorial', 'attribution')}}
        self.env = patch.dict(os.environ, {'TRIBAL_WRITER_ENABLED': '1', 'AZURE_OPENAI_DEPLOYMENT': 'test-deployment'})
        self.env.start(); self.addCleanup(self.env.stop)
        self.ready = patch.object(writer, 'configured', return_value=True)
        self.ready.start(); self.addCleanup(self.ready.stop)
        self.fetch = patch.object(writer, 'fetch_sources', return_value=[self.source]).start()
        self.addCleanup(patch.stopall)
        self.factory = patch.object(writer, 'AzureWriter').start()
        self.client = self.factory.return_value
        self.client.usage = {'prompt_tokens': 100, 'completion_tokens': 100}
        self.client.complete.side_effect = [self.payload, self.payload, self.review]
        self.reservation = patch.object(writer, 'persist_reservation').start()

    def generate(self):
        with redirect_stdout(io.StringIO()):
            return writer.generate(self.root)

    def check(self, path):
        return compliance.check_publishable(path.read_text(), [self.url])

    def test_three_stages_produce_checkable_exact_article_and_daily_retry_is_free(self):
        path = self.generate()
        self.assertTrue(self.check(path)['pass'], self.check(path))
        self.assertEqual(self.client.complete.call_count, 3)
        self.assertIsNone(self.generate())
        self.assertEqual(self.client.complete.call_count, 3)
        self.assertEqual(self.fetch.call_count, 1)

    def test_editor_review_hold_survives_existing_check_and_approve(self):
        self.review['checks']['grounded'] = False
        path = self.generate()
        self.assertFalse(self.check(path)['pass'])
        draft = self.root / 'drafts' / path.name
        draft.write_bytes(path.read_bytes())
        queue = self.root / 'state/queue.json'
        queue.write_text(json.dumps({'items': [{'file': 'drafts/' + path.name, 'source_urls': [self.url], 'status': 'held'}]}))
        with patch.multiple(run_daily, ROOT=self.root, STATE_DIR=self.root/'state', DRAFTS_DIR=self.root/'drafts',
                            QUEUE_PATH=queue, SEEN_PATH=self.root/'state/seen.json'), redirect_stdout(io.StringIO()):
            self.assertEqual(run_daily.cmd_check(), 2)
            self.assertEqual(run_daily.cmd_approve('drafts/' + path.name), 1)
        self.assertEqual(json.loads(queue.read_text())['items'][0]['status'], 'held')

    def test_review_outage_retains_held_article(self):
        self.client.complete.side_effect = [self.payload, self.payload, writer.WriterConnectionError('Model unavailable')]
        path = self.generate()
        self.assertIsNotNone(path)
        self.assertFalse(self.check(path)['pass'])

    def test_source_failure_reserves_day_without_spend_or_filler(self):
        self.fetch.side_effect = writer.SourceResearchError('Source unavailable')
        self.assertIsNone(self.generate())
        self.assertIsNone(self.generate())
        self.client.complete.assert_not_called()
        self.assertEqual(self.fetch.call_count, 1)
        self.assertEqual(list((self.root/'manuscripts').glob('*.md')), [])

    def test_failed_remote_reservation_stops_research_and_model_calls(self):
        self.reservation.side_effect = writer.WriterConnectionError('Reservation push failed')
        self.assertIsNone(self.generate())
        self.fetch.assert_not_called()
        self.client.complete.assert_not_called()

    def test_review_failure_preserves_usage_from_earlier_model_calls(self):
        self.client.complete.side_effect = [self.payload, self.payload, writer.WriterConnectionError('Review unavailable')]
        self.generate()
        ledger = json.loads((self.root/'state/writer.json').read_text())
        attempt = next(iter(ledger['attempts'].values()))
        self.assertEqual(attempt['usage'], self.client.usage)

    def test_unverified_source_excerpt_keeps_otherwise_passing_model_review_held(self):
        self.payload['sourceNotes'][0]['evidenceQuote'] = 'This sentence is invented and does not appear in the source'
        self.assertFalse(self.check(self.generate())['pass'])

    def test_public_text_or_faq_edits_invalidate_review(self):
        path = self.generate()
        meta, body = compliance.parse_article(path.read_text())
        for changed_meta, changed_body in ((meta, body+'\nA new observation.\n'),
                                            ({**meta, 'faq': [{'question': 'A question?', 'answer': 'A new answer.'}]}, body)):
            result = compliance.check_publishable(encode(changed_meta, changed_body), [self.url])
            self.assertIn('writer-review-required', [flag['rule'] for flag in result['flags']])

    def test_unresearched_topic_and_existing_query_are_never_generated(self):
        for change in ('research-needed', 'duplicate'):
            with self.subTest(change=change):
                if change == 'research-needed':
                    self.topic['status'] = 'research-needed'
                    (self.root/'topic-plan.json').write_text(json.dumps({'topics': [self.topic]}))
                else:
                    self.topic['status'] = 'writer-ready'
                    (self.root/'topic-plan.json').write_text(json.dumps({'topics': [self.topic]}))
                    (self.root.parent/'daily-kava.js').write_text('{"primaryKeyword":"test kava article"}')
                self.assertIsNone(self.generate())
        self.client.complete.assert_not_called()

    def test_disabled_writer_does_not_fetch_or_call_model(self):
        with patch.dict(os.environ, {'TRIBAL_WRITER_ENABLED': '0'}):
            self.assertIsNone(self.generate())
        self.fetch.assert_not_called()
        self.client.complete.assert_not_called()


class RemoteReservationTests(unittest.TestCase):
    def test_stale_concurrent_checkout_cannot_reserve_another_attempt(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            remote = base/'remote.git'
            def git(*args, cwd=None):
                return subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True, text=True)
            git('init', '--bare', '--initial-branch=master', str(remote))
            first = base/'first'; second = base/'second'
            git('clone', str(remote), str(first))
            git('config', 'user.name', 'fckaemail-cyber', cwd=first)
            git('config', 'user.email', 'f.ckaemail@gmail.com', cwd=first)
            (first/'README.md').write_text('Isolated reservation regression repository')
            git('add', 'README.md', cwd=first)
            git('commit', '-m', 'Initialize isolated test', cwd=first)
            git('push', 'origin', 'master', cwd=first)
            git('clone', str(remote), str(second))
            for checkout, name in ((first, 'first'), (second, 'second')):
                state = checkout/'daily-engine/state'; state.mkdir(parents=True)
                (state/'writer.json').write_text(json.dumps({'attempt': name}))
            with patch.dict(os.environ, {'TRIBAL_WRITER_RESERVE_REMOTE': '1', 'GITHUB_BRANCH': 'master'}):
                writer.persist_reservation(first/'daily-engine')
                with self.assertRaises(writer.WriterConnectionError):
                    writer.persist_reservation(second/'daily-engine')
            saved = git('--git-dir='+str(remote), 'show', 'master:daily-engine/state/writer.json').stdout
            self.assertEqual(json.loads(saved)['attempt'], 'first')


if __name__ == '__main__':
    unittest.main()
