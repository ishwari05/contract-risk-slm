"""Inference: PDF -> clauses -> label probabilities -> calibrated confidence -> escalation.

CLI:  python infer.py contract.pdf
"""
import json
import os
import sys
from contextlib import nullcontext

import torch
import torch.nn.functional as F
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from common import (ADAPTER_DIR, BASE_MODEL, CALIB_PATH, LABELS, LETTERS,
                    build_prompt, segment_contract)


def decide(logits, T, tau, tau_high, min_margin):
    """logits: [N, n_labels] raw label logits. Returns one decision dict per row.

    Escalate to a human when ANY rule fires:
      1. calibrated confidence < tau
      2. top-1 vs top-2 margin < min_margin (ambiguous between two categories)
      3. predicted High-risk category with confidence < tau_high (stricter bar)
    """
    probs = F.softmax(logits / T, dim=-1)
    top = probs.topk(3, dim=-1)
    out = []
    for i in range(len(probs)):
        idx, p = top.indices[i].tolist(), top.values[i].tolist()
        letter = LETTERS[idx[0]]
        category, risk, _ = LABELS[letter]
        conf, margin = p[0], p[0] - p[1]
        reasons = []
        if conf < tau:
            reasons.append(f"low confidence ({conf:.2f} < {tau:.2f})")
        if margin < min_margin:
            reasons.append(f"ambiguous: runner-up '{LABELS[LETTERS[idx[1]]][0]}' is close")
        if risk == "High" and conf < tau_high:
            reasons.append(f"high-risk clause below stricter threshold {tau_high:.2f}")
        out.append({
            "pred_idx": idx[0], "letter": letter, "category": category, "risk": risk,
            "confidence": conf, "margin": margin,
            "top3": [(LABELS[LETTERS[j]][0], round(pj, 3)) for j, pj in zip(idx, p)],
            "escalate": bool(reasons), "reasons": reasons,
        })
    return out


class ClauseAnalyzer:
    def __init__(self, base=BASE_MODEL, adapter=ADAPTER_DIR):
        has_adapter = os.path.isdir(adapter)
        self.tok = AutoTokenizer.from_pretrained(adapter if has_adapter else base)
        self.tok.padding_side = "left"  # needed for last-token logits in batches
        if self.tok.pad_token is None:
            self.tok.pad_token = self.tok.eos_token

        if torch.cuda.is_available():
            dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
            bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                                     bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=dtype)
            model = AutoModelForCausalLM.from_pretrained(
                base, quantization_config=bnb, device_map={"": 0}, torch_dtype=dtype)
        else:  # slow CPU fallback: point BASE_MODEL at a small model (e.g. Qwen2.5-1.5B-Instruct)
            model = AutoModelForCausalLM.from_pretrained(base, torch_dtype=torch.float32)
        self.model = PeftModel.from_pretrained(model, adapter) if has_adapter else model
        self.model.eval()

        self.label_ids = []
        for l in LETTERS:
            ids = self.tok.encode(l, add_special_tokens=False)
            assert len(ids) == 1, f"label {l!r} must be a single token"
            self.label_ids.append(ids[0])

        cal = json.load(open(CALIB_PATH)) if os.path.exists(CALIB_PATH) else {}
        self.T = cal.get("temperature", 1.0)
        self.tau = cal.get("tau", 0.80)
        self.tau_high = cal.get("tau_high", 0.90)
        self.min_margin = cal.get("min_margin", 0.15)

    @torch.no_grad()
    def label_logits(self, texts, batch_size=4, progress=None):
        """Logits of the first generated token, restricted to the label letters."""
        chunks = []
        for i in range(0, len(texts), batch_size):
            prompts = [build_prompt(self.tok, t) for t in texts[i:i + batch_size]]
            enc = self.tok(prompts, return_tensors="pt", padding=True,
                           add_special_tokens=False).to(self.model.device)
            last = self.model(**enc).logits[:, -1, :]
            chunks.append(last[:, self.label_ids].float().cpu())
            if progress:
                progress(min(1.0, (i + batch_size) / len(texts)))
        return torch.cat(chunks) if chunks else torch.empty(0, len(LETTERS))

    def classify(self, texts, tau=None, progress=None):
        tau = tau if tau is not None else self.tau
        return decide(self.label_logits(texts, progress=progress), self.T,
                      tau, max(tau, self.tau_high), self.min_margin)

    @torch.no_grad()
    def summarise(self, clause, category):
        """Zero-shot summary from the BASE model (LoRA adapter switched off)."""
        msgs = [
            {"role": "system", "content": "You are a careful legal assistant. Summarise faithfully; never add terms that are not in the text."},
            {"role": "user", "content": f"Summarise this {category} clause in two plain-English sentences, then state the main risk to the signing party in one sentence.\n\n{clause}"},
        ]
        prompt = self.tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        enc = self.tok(prompt, return_tensors="pt", add_special_tokens=False).to(self.model.device)
        ctx = self.model.disable_adapter() if isinstance(self.model, PeftModel) else nullcontext()
        with ctx:
            out = self.model.generate(**enc, max_new_tokens=120, do_sample=False)
        return self.tok.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True).strip()


def extract_pdf_text(data: bytes) -> str:
    """Text PDFs only (scanned PDFs need OCR first, e.g. ocrmypdf). Blocks -> paragraphs."""
    import fitz  # PyMuPDF
    paras = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            for b in page.get_text("blocks"):
                if b[6] == 0 and b[4].strip():
                    paras.append(" ".join(b[4].split()))
    return "\n\n".join(paras)


def analyze_document(an: ClauseAnalyzer, text: str, tau=None, progress=None):
    spans = segment_contract(text)
    clauses = [text[s:e].strip() for s, e in spans]
    decisions = an.classify(clauses, tau=tau, progress=progress)
    results = []
    for i, (c, d) in enumerate(zip(clauses, decisions)):
        d = {k: v for k, v in d.items() if k != "pred_idx"}
        d.update(idx=i, text=c, summary="")
        if d["category"] != "None":  # only summarise flagged clauses (saves compute)
            d["summary"] = an.summarise(c, d["category"])
        results.append(d)
    return results


if __name__ == "__main__":
    an = ClauseAnalyzer()
    raw = open(sys.argv[1], "rb").read()
    txt = extract_pdf_text(raw) if sys.argv[1].lower().endswith(".pdf") else raw.decode("utf-8", "ignore")
    res = [r for r in analyze_document(an, txt) if r["category"] != "None" or r["escalate"]]
    print(json.dumps(res, indent=2, ensure_ascii=False))
