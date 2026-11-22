#!/usr/bin/env python3
"""Prepare an unaccepted project-local receipt. Does not capture, score or build."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys

def prepare(brief, target, repository, output):
    brief = Path(brief).resolve()
    output = Path(output).resolve()
    if not brief.is_file() or not brief.read_bytes().strip():
        raise ValueError('A nonempty actual project brief is required')
    if not target.strip() or not repository.strip():
        raise ValueError('Target and existing repository required')
    if output.exists():
        raise ValueError('Evidence directory exists; preserve it and update the existing receipt')
    template = Path(__file__).resolve().parents[1]/'references'/'quality-receipt.template.json'
    data = json.loads(template.read_text())
    data.update(target=target, repository=repository)
    output.mkdir(parents=True)
    shutil.copyfile(brief, output/'brief.md')
    digest = hashlib.sha256((output/'brief.md').read_bytes()).hexdigest()
    data.update(brief_hash=digest, brief_artifact='brief')
    data['artifacts']['brief']={'path':'brief.md','sha256':digest}
    (output/'quality-receipt.json').write_text(json.dumps(data,indent=2)+'\n')
    return {'receipt':str(output/'quality-receipt.json'),'accepted':False,
            'next':'Observe actual reference sites and register evidence; do not invent passing entries.',
            'batch_execution':'on_hold'}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--brief',required=True);p.add_argument('--target',required=True)
    p.add_argument('--repository',required=True);p.add_argument('--output',required=True)
    a=p.parse_args()
    try: result=prepare(a.brief,a.target,a.repository,a.output)
    except (OSError,ValueError) as e: print(str(e),file=sys.stderr);return 2
    print(json.dumps(result,indent=2));return 0

if __name__=='__main__':sys.exit(main())
