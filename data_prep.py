"""Turn CUAD (SQuAD-style CUAD_v1.json) into clause-level classification samples.

Usage:
    python data_prep.py --cuad CUAD_v1/CUAD_v1.json

Each output row: {"contract", "text", "label" (letter), "all_labels"}.
Splits are made BY CONTRACT to avoid leakage between train/val/test.
"""
import argparse
import collections
import json
import os
import random

from common import CATEGORY_TO_LETTER, DATA_DIR, LABELS, RISK_RANK, segment_contract


def build_rows(title, para):
    ctx = para["context"]
    spans = []
    for qa in para["qas"]:
        # ids look like "<CONTRACT_TITLE>__<Category Name>"
        letter = CATEGORY_TO_LETTER.get(qa["id"].split("__")[-1].strip().lower())
        if not letter:
            continue
        for a in qa["answers"]:
            spans.append((a["answer_start"], a["answer_start"] + len(a["text"]), letter))

    rows = []
    for cs, ce in segment_contract(ctx):
        # assign each gold span to the chunk containing its midpoint
        hits = sorted({l for s, e, l in spans if cs <= (s + e) / 2 < ce})
        # single-label simplification: keep the highest-risk category in the chunk
        label = max(hits, key=lambda l: RISK_RANK[LABELS[l][1]]) if hits else "N"
        rows.append({"contract": title, "text": ctx[cs:ce].strip(), "label": label, "all_labels": hits})
    return rows


def rebalance(rows, neg_ratio, rng):
    pos = [r for r in rows if r["label"] != "N"]
    neg = [r for r in rows if r["label"] == "N"]
    rng.shuffle(neg)
    out = pos + neg[: int(len(pos) * neg_ratio)]
    rng.shuffle(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cuad", required=True, help="path to CUAD_v1.json")
    ap.add_argument("--out", default=DATA_DIR)
    ap.add_argument("--train_neg_ratio", type=float, default=1.0)
    ap.add_argument("--eval_neg_ratio", type=float, default=3.0)
    ap.add_argument("--max_train", type=int, default=6000)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    rng = random.Random(args.seed)

    data = json.load(open(args.cuad, encoding="utf-8"))["data"]
    by_contract = collections.defaultdict(list)
    for doc in data:
        for para in doc["paragraphs"]:
            by_contract[doc["title"]].extend(build_rows(doc["title"], para))

    titles = sorted(by_contract)
    rng.shuffle(titles)
    n = len(titles)
    split_titles = {
        "train": titles[: int(0.8 * n)],
        "val": titles[int(0.8 * n): int(0.9 * n)],
        "test": titles[int(0.9 * n):],
    }

    os.makedirs(args.out, exist_ok=True)
    for split, ts in split_titles.items():
        rows = [r for t in ts for r in by_contract[t]]
        ratio = args.train_neg_ratio if split == "train" else args.eval_neg_ratio
        rows = rebalance(rows, ratio, rng)
        if split == "train":
            rows = rows[: args.max_train]
        with open(os.path.join(args.out, f"{split}.jsonl"), "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        dist = collections.Counter(LABELS[r["label"]][0] for r in rows)
        print(f"{split}: {len(ts)} contracts, {len(rows)} chunks")
        for k, v in dist.most_common():
            print(f"    {k:28s} {v}")


if __name__ == "__main__":
    main()
