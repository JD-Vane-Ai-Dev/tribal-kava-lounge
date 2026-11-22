#!/usr/bin/env python3
"""Validate design evidence and stage readiness; never judge pixels or run a browser.

Evidence paths are relative to --root. A passing receipt is a process check, not
a guarantee of aesthetic merit, accessibility compliance, or owner approval.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import io
from datetime import datetime
from urllib.parse import urlparse

STAGES = ('study', 'directions', 'page', 'accept')
AXES = ('composition', 'typography', 'imagery', 'density', 'motion')
DIMENSIONS = ('identity', 'hierarchy', 'typography', 'imagery', 'rhythm', 'mobile', 'conversion')
CHECKS = ('build', 'primary_journey', 'navigation', 'responsive', 'keyboard',
          'contrast', 'reduced_motion', 'assets', 'console', 'performance', 'seo')
PLACEHOLDERS = {'', 'none', 'n/a', 'tbd', 'pending', 'mock', 'untested', 'not tested'}

def nonempty(value):
    return isinstance(value, str) and value.strip().lower() not in PLACEHOLDERS

def timestamp(value):
    try:
        d = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return d.utcoffset() is not None
    except (AttributeError, TypeError, ValueError):
        return False

def url(value):
    if not isinstance(value, str):
        return False
    try:
        p = urlparse(value)
        return p.scheme in ('http', 'https') and bool(p.hostname) and not p.username and not p.password
    except (TypeError, ValueError):
        return False

def validate(data, root, stage='accept'):
    errors = []
    root = Path(root).resolve()
    if stage not in STAGES:
        return ['invalid stage']
    if not isinstance(data, dict):
        return ['receipt must be an object']
    level = STAGES.index(stage)
    def need(condition, message):
        if not condition:
            errors.append(message)
    def strings(obj, keys, label):
        for key in keys:
            need(nonempty(obj.get(key)), f'{label}: {key} required')
    def objects(value, label):
        if not isinstance(value, list):
            errors.append(f'{label}: array required')
            return []
        out = []
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                errors.append(f'{label}[{i}]: object required')
            else:
                out.append(item)
        return out
    artifacts = data.get('artifacts', {})
    if not isinstance(artifacts, dict):
        errors.append('artifacts must be an object')
        artifacts = {}
    seen_paths = {}
    seen_captures = set()
    seen_image_hashes = set()
    def artifact(key, label, image=False):
        record = artifacts.get(key) if isinstance(key, str) else None
        if not isinstance(record, dict):
            errors.append(f'{label}: registered artifact required')
            return False
        path = record.get('path')
        digest = record.get('sha256')
        if not nonempty(path) or Path(path).is_absolute():
            errors.append(f'{label}: relative artifact path required')
            return False
        p = (root / path).resolve()
        if not p.is_relative_to(root) or not p.is_file():
            errors.append(f'{label}: artifact absent or outside evidence root')
            return False
        if not isinstance(digest, str) or not re.fullmatch(r'[a-f0-9]{64}', digest):
            errors.append(f'{label}: SHA256 required')
            return False
        raw = p.read_bytes()
        ok = hashlib.sha256(raw).hexdigest() == digest
        need(ok, f'{label}: artifact hash mismatch')
        if image:
            is_image = (raw.startswith(b'\x89PNG\r\n\x1a\n') or raw.startswith(b'\xff\xd8\xff')
                        or (raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'))
            need(is_image, f'{label}: PNG/JPEG/WebP screenshot required')
            try:
                from PIL import Image
                with Image.open(io.BytesIO(raw)) as decoded:
                    need(decoded.format in ('PNG', 'JPEG', 'WEBP'), f'{label}: invalid screenshot format')
                    decoded.verify()
                with Image.open(io.BytesIO(raw)) as decoded:
                    decoded.load()
            except ImportError:
                errors.append('Pillow is required to verify screenshot decoding; install it in the authorized test environment')
            except (OSError, ValueError, SyntaxError):
                errors.append(f'{label}: screenshot cannot be decoded')
            # One physical file must not masquerade as multiple viewport captures.
            if str(p) in seen_paths and seen_paths[str(p)] != key:
                errors.append(f'{label}: screenshot reused under another artifact ID')
            seen_paths[str(p)] = key
        return ok
    def captures(value, label, revision=None, require_desktop=True, tablet=False):
        rows = objects(value, label)
        widths = []
        ids = []
        for c in rows:
            strings(c, ('artifact', 'environment'), label)
            need(url(c.get('url')), f'{label}: capture URL required')
            need(timestamp(c.get('captured_at')), f'{label}: dated capture required')
            need(c.get('method') == 'browser', f'{label}: actual browser capture required')
            viewport = c.get('viewport', {})
            width, height = (viewport.get('width'), viewport.get('height')) if isinstance(viewport, dict) else (None, None)
            valid = type(width) is int and type(height) is int and width > 0 and height > 0
            need(valid, f'{label}: numeric viewport required')
            if valid:
                widths.append(width)
            if revision is not None:
                need(c.get('revision') == revision, f'{label}: stale or absent revision')
            artifact(c.get('artifact'), label, image=True)
            key = c.get('artifact')
            need(str(key) not in seen_captures, f'{label}: capture reused across study/direction/page')
            seen_captures.add(str(key))
            image_record = artifacts.get(key, {}) if isinstance(key, str) else {}
            image_hash = image_record.get('sha256') if isinstance(image_record, dict) else None
            if isinstance(image_hash, str) and re.fullmatch(r'[a-f0-9]{64}', image_hash):
                need(image_hash not in seen_image_hashes, f'{label}: identical screenshot reused for another capture')
                seen_image_hashes.add(image_hash)
            ids.append(c.get('artifact'))
        need(len(ids) == len(set(str(i) for i in ids)), f'{label}: duplicate screenshot')
        need(any(320 <= w <= 430 for w in widths), f'{label}: phone capture required')
        if require_desktop:
            need(any(w >= 1280 for w in widths), f'{label}: desktop capture required')
        if tablet:
            need(any(700 <= w <= 1100 for w in widths), f'{label}: tablet capture required')
        return ids
    need(data.get('schema_version') == '2.0', 'schema_version must be 2.0')
    strings(data, ('target', 'repository', 'brief_hash'), 'project')
    need(type(data.get('deployment_required')) is bool, 'deployment_required must be an explicit boolean')
    need(isinstance(data.get('brief_hash'), str) and bool(re.fullmatch(r'[a-f0-9]{64}', data['brief_hash'])), 'brief_hash must be SHA256')
    artifact(data.get('brief_artifact'), 'brief')
    brief_record = artifacts.get(data.get('brief_artifact'), {}) if isinstance(data.get('brief_artifact'), str) else {}
    if not isinstance(brief_record, dict): brief_record = {}
    need(brief_record.get('sha256') == data.get('brief_hash'), 'brief hash must match brief artifact')
    refs = objects(data.get('studies'), 'studies')
    need(len(refs) >= 3, 'at least three observed reference studies required')
    ref_ids = [r.get('id') for r in refs]
    need(all(nonempty(i) for i in ref_ids) and len(set(str(i) for i in ref_ids)) == len(ref_ids), 'reference IDs must be unique')
    ref_urls = [str(r.get('url', '')).rstrip('/').lower() for r in refs]
    need(len(set(ref_urls)) == len(ref_urls), 'reference URLs must be distinct')
    need(sum(r.get('kind') == 'shipped_site' for r in refs) >= 2, 'at least two shipped-site studies required; component catalogs do not substitute')
    for r in refs:
        label = f'study {r.get("id")}'
        need(url(r.get('url')), f'{label}: source URL required')
        need(timestamp(r.get('observed_at')), f'{label}: observation timestamp required')
        need(r.get('evidence_level') == 'observed', f'{label}: catalog-only entry cannot pass')
        strings(r, ('license_status', 'interaction_observation', 'limitations'), label)
        captures(r.get('captures'), label)
        decisions = objects(r.get('decisions'), label + ' decisions')
        need(len(decisions) >= 2, f'{label}: at least two concrete decisions required')
        for d in decisions:
            strings(d, ('element', 'observation', 'measurement', 'why', 'use_when', 'avoid_when', 'adaptation'), label)
    if level == 0:
        return errors
    strings(data, ('directions_revision', 'builder_run_id'), 'direction rendering')
    directions = objects(data.get('directions'), 'directions')
    need(len(directions) == 3, 'exactly three rendered directions required')
    direction_ids = [d.get('id') for d in directions]
    direction_capture_ids = []
    need(all(nonempty(i) for i in direction_ids) and len(set(str(i) for i in direction_ids)) == len(direction_ids), 'direction IDs must be unique')
    for d in directions:
        label = f'direction {d.get("id")}'
        strings(d, ('thesis', 'tradeoffs', 'content_hash'), label)
        need(d.get('content_hash') == data.get('brief_hash'), f'{label}: use same brief/content')
        axes = d.get('axes', {})
        if not isinstance(axes, dict): axes = {}
        strings(axes, AXES, label)
        need(d.get('hero_and_lower_section') is True, f'{label}: hero and lower section must be rendered')
        direction_capture_ids.extend(captures(d.get('captures'), label, data.get('directions_revision')))
        links = d.get('study_ids', [])
        need(isinstance(links, list) and bool(links) and all(i in ref_ids for i in links), f'{label}: study linkage required')
    for i, a in enumerate(directions):
        for b in directions[i+1:]:
            aa = a.get('axes', {}) if isinstance(a.get('axes'), dict) else {}
            bb = b.get('axes', {}) if isinstance(b.get('axes'), dict) else {}
            differences = sum(nonempty(aa.get(k)) and nonempty(bb.get(k)) and aa[k].strip().lower() != bb[k].strip().lower() for k in AXES)
            need(differences >= 3, f'directions {a.get("id")}/{b.get("id")}: fewer than three non-color axis differences')
    need(data.get('selected_direction') in direction_ids, 'selected direction required')
    strings(data, ('selection_rationale',), 'direction selection')
    artifact(data.get('design_contract'), 'design contract')
    direction_review = data.get('direction_review', {})
    if not isinstance(direction_review, dict): direction_review = {}
    strings(direction_review, ('reviewer_run_id', 'comparison'), 'direction review')
    need(direction_review.get('reviewer_run_id') != data.get('builder_run_id'), 'independent direction reviewer must differ from builder')
    need(direction_review.get('revision') == data.get('directions_revision'), 'direction review revision mismatch')
    need(direction_review.get('blind_to_builder_rationale') is True, 'direction review must exclude builder self-justification')
    need(direction_review.get('decision') == 'pass', 'independent direction review has not passed')
    reviewed_directions = direction_review.get('capture_ids', [])
    need(isinstance(reviewed_directions, list) and all(i in reviewed_directions for i in direction_capture_ids), 'direction review must cover all rendered concepts')
    artifact(direction_review.get('evidence'), 'direction review output')
    if level == 1:
        return errors
    strings(data, ('revision', 'builder_run_id'), 'implementation')
    page = data.get('page', {})
    if not isinstance(page, dict): page = {}
    need(page.get('complete_page') is True, 'complete representative page required')
    need(url(page.get('url')), 'representative page URL required')
    page_ids = captures(page.get('captures'), 'page', data.get('revision'), tablet=True)
    reviews = objects(data.get('reviews'), 'reviews')
    matching = [r for r in reviews if r.get('revision') == data.get('revision')]
    need(bool(matching), 'current-revision independent review required')
    if matching:
        review = matching[-1]
        strings(review, ('reviewer_run_id', 'comparison_to_references', 'direction_distinctness'), 'review')
        need(review.get('reviewer_run_id') != data.get('builder_run_id'), 'builder cannot be own independent reviewer')
        need(review.get('blind_to_builder_rationale') is True, 'review must exclude builder self-justification')
        need(review.get('direction_distinctness_pass') is True, 'reviewer must confirm meaningful direction differences')
        reviewed = review.get('capture_ids', [])
        need(isinstance(reviewed, list) and all(i in reviewed for i in page_ids), 'review must cover all current page captures')
        artifact(review.get('evidence'), 'independent review output')
        ratings = review.get('dimensions', {})
        if not isinstance(ratings, dict): ratings = {}
        for dimension in DIMENSIONS:
            rating = ratings.get(dimension, {})
            if not isinstance(rating, dict): rating = {}
            score = rating.get('score')
            need(type(score) in (int, float) and 4 <= score <= 5, f'review {dimension}: needs observed 4/5 or better')
            strings(rating, ('observation', 'reference_comparison'), 'review ' + dimension)
        need(review.get('decision') == 'pass', 'independent visual review has not passed')
    findings = objects(data.get('findings', []), 'findings')
    for finding in findings:
        strings(finding, ('id', 'location', 'problem', 'fix'), 'finding')
        need(finding.get('status') == 'resolved', f'finding {finding.get("id")}: unresolved')
        need(finding.get('verified_revision') == data.get('revision'), 'finding requires current-revision recheck')
        artifact(finding.get('resolution_evidence'), 'finding resolution')
    checks = objects(data.get('checks'), 'checks')
    names = [c.get('name') for c in checks]
    need(len(names) == len(set(str(n) for n in names)), 'duplicate check names')
    required_checks = CHECKS if level == 3 else ('build', 'primary_journey', 'navigation', 'responsive', 'assets')
    for name in required_checks:
        need(name in names, f'required check absent: {name}')
    for check in checks:
        if level < 3 and check.get('name') not in required_checks:
            continue
        label = 'check ' + str(check.get('name'))
        need(check.get('status') == 'pass', f'{label}: not passed')
        strings(check, ('method', 'environment'), label)
        need(check.get('revision') == data.get('revision'), f'{label}: stale revision')
        artifact(check.get('evidence'), label)
    if level == 3:
        if data.get('deployment_required') is True:
            deploy = data.get('deployment', {})
            if not isinstance(deploy, dict): deploy = {}
            strings(deploy, ('id',), 'deployment')
            need(url(deploy.get('url')), 'deployment URL required')
            need(deploy.get('revision') == data.get('revision'), 'deployment revision mismatch')
            artifact(deploy.get('journey_evidence'), 'deployed journey')
    return errors

def evaluate(data, root, stage='accept'):
    errors = validate(data, root, stage)
    return {'stage': stage, 'ready': not errors, 'verified': stage == 'accept' and not errors,
            'production_authorized': False, 'errors': errors,
            'limitation': 'Checks evidence integrity and recorded decisions; does not independently judge aesthetics or prove browser observations.'}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('receipt')
    p.add_argument('--root', required=True)
    p.add_argument('--stage', choices=STAGES, default='accept')
    a = p.parse_args()
    try:
        result = evaluate(json.loads(Path(a.receipt).read_text()), a.root, a.stage)
    except (OSError, ValueError, TypeError) as e:
        print(json.dumps({'ready': False, 'verified': False, 'errors': [str(e)]}))
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result['ready'] else 1

if __name__ == '__main__':
    sys.exit(main())
