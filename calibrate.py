"""Fit temperature scaling on the validation split, pick the escalation threshold,
and report selective-prediction metrics on the held-out test split.

Usage:  python calibrate.py --target_acc 0.95
"""
import argparse
import json
import os

import torch
import torch.nn.functional as F

from common import CALIB_PATH, DATA_DIR, LABELS, LETTERS
from infer import ClauseAnalyzer, decide


def load(split):
    return [json.loads(l) for l in open(f"{DATA_DIR}/{split}.jsonl", encoding="utf-8")]


def fit_temperature(logits, y):
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=100)

    def closure():
        opt.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), y)
        loss.backward()
        return loss

    opt.step(closure)
    return log_t.exp().item()


def ece(conf, correct, bins=10):
    edges, total = torch.linspace(0, 1, bins + 1), 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.float().mean().item() * abs(correct[m].float().mean().item() - conf[m].mean().item())
    return total


def choose_tau(conf, correct, target_acc, min_accepted=30):
    """Lowest threshold (max automation) whose auto-accepted predictions hit target accuracy."""
    for tau in [round(0.50 + 0.01 * i, 2) for i in range(50)]:
        acc_mask = conf >= tau
        if acc_mask.sum() >= min_accepted and correct[acc_mask].float().mean() >= target_acc:
            return tau
    return 0.99


def report(name, logits, y, T, tau, tau_high, min_margin):
    dec = decide(logits, T, tau, tau_high, min_margin)
    pred = torch.tensor([d["pred_idx"] for d in dec])
    esc = torch.tensor([d["escalate"] for d in dec])
    correct = pred == y
    auto = ~esc
    print(f"\n== {name} (n={len(y)}) ==")
    print(f"raw accuracy                 : {correct.float().mean():.3f}")
    print(f"auto-handled coverage        : {auto.float().mean():.3f}")
    print(f"accuracy on auto-handled     : {correct[auto].float().mean():.3f}")
    print(f"accuracy on escalated        : {correct[esc].float().mean() if esc.any() else float('nan'):.3f}")
    high = torch.tensor([LABELS[LETTERS[int(i)]][1] == "High" for i in y])
    if high.any():
        # a true High-risk clause is "safe" if the model got it right OR handed it to a human
        safe = (correct | esc)[high].float().mean()
        missed = (~correct & ~esc)[high].float().mean()
        print(f"High-risk clauses: safely handled {safe:.3f} | silently wrong {missed:.3f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target_acc", type=float, default=0.95)
    ap.add_argument("--min_margin", type=float, default=0.15)
    args = ap.parse_args()

    an = ClauseAnalyzer()

    def run(split):
        rows = load(split)
        logits = an.label_logits([r["text"] for r in rows])
        y = torch.tensor([LETTERS.index(r["label"]) for r in rows])
        return logits, y

    vl, vy = run("val")
    T = fit_temperature(vl, vy)
    for name, t in [("before", 1.0), ("after ", T)]:
        p = F.softmax(vl / t, dim=-1)
        conf, pred = p.max(-1)
        print(f"val ECE {name}: {ece(conf, pred == vy):.4f}")
    print(f"temperature T = {T:.3f}")

    conf, pred = F.softmax(vl / T, dim=-1).max(-1)
    tau = choose_tau(conf, pred == vy, args.target_acc)
    tau_high = max(tau, 0.90)
    print(f"tau = {tau}, tau_high = {tau_high}")

    report("VAL", vl, vy, T, tau, tau_high, args.min_margin)
    tl, ty = run("test")
    report("TEST", tl, ty, T, tau, tau_high, args.min_margin)

    os.makedirs(os.path.dirname(CALIB_PATH) or ".", exist_ok=True)
    json.dump({"temperature": T, "tau": tau, "tau_high": tau_high, "min_margin": args.min_margin},
              open(CALIB_PATH, "w"), indent=2)
    print("saved", CALIB_PATH)


if __name__ == "__main__":
    main()
