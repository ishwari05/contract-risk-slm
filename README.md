# Contract Clause Risk-Flagging with a Domain-Adapted SLM

Domain-adapted SLM for automated contract clause risk-flagging and summarization, with confidence-calibrated escalation of ambiguous clauses to human lawyers. Fully on-prem: no client text leaves your machine.

## 1. Architecture

```
 PDF contract
     |
     v
 [1] Text extraction (PyMuPDF blocks -> paragraphs)         infer.extract_pdf_text
     |
     v
 [2] Clause segmentation (blank-line paras, 60-220 words)   common.segment_contract
     |
     v
 [3] SLM classifier: Qwen2.5-7B-Instruct + QLoRA adapter    infer.ClauseAnalyzer
     one forward pass per clause -> logits over 13 label letters (A..L, N=none)
     |
     v
 [4] Calibration: softmax(logits / T)  -> confidence, margin infer.decide
     |
     +--> risk tier = lookup(category)  (High / Medium / Low)
     |
     +--> escalate?  conf < tau | margin < 0.15 | High-risk & conf < tau_high
     |         |                                   
     |         v yes                               
     |     [5] SQLite review queue  -->  lawyer corrects label in Streamlit  store.py, app.py
     |         |                                   
     |         v                                   
     |     feedback.jsonl  -->  next fine-tuning round (active-learning loop)
     v no
 [6] Zero-shot summary (same model, adapter disabled) for flagged clauses
     |
     v
 Streamlit dashboard (risk-sorted clauses, summaries, confidence, escalation reasons)
```

Key design choice: the classifier answers with a **single letter token**, so the model's next-token distribution over the label letters *is* a proper class-probability vector. No text parsing, and calibration is a clean 1-parameter problem.

## 2. Run order

```bash
pip install -r requirements.txt
# CUAD: download CUAD_v1.zip from atticusprojectai.org/cuad (or Zenodo) and unzip -> CUAD_v1.json

python data_prep.py --cuad CUAD_v1/CUAD_v1.json     # -> data/{train,val,test}.jsonl
python train_lora.py                                # -> outputs/lora_adapter   (GPU, 4-bit)
python calibrate.py --target_acc 0.95               # -> outputs/calibration.json + test report
python infer.py some_contract.pdf                   # CLI check
streamlit run app.py                                # dashboard
```

Compute: 7B QLoRA at seq-len <=1024, batch 1 x grad-accum 16 fits a 16 GB GPU (Colab/Kaggle T4). To iterate faster first, set `BASE_MODEL=Qwen/Qwen2.5-1.5B-Instruct` (Apache-2.0) and re-run the same commands.

## 3. Data processing

- CUAD ships as SQuAD-style JSON: 510 contracts x 41 questions; each answer is a character span. Question ids end in `__<Category>`.
- Contracts are cut into clause-sized chunks; each gold answer span is assigned to the chunk containing its midpoint. A chunk with several categories keeps the highest-risk one (single-label simplification; a multi-label head is a natural upgrade).
- 12 risk-relevant categories + `None`. Splits are **by contract** (80/10/10) to avoid leakage.
- Train set is rebalanced (1:1 negatives) and capped at 6,000 samples. Val/test keep 3:1 negatives to stay tractable.
- **Caveat:** val/test are rebalanced, so the fitted threshold may be optimistic on a real contract's natural class distribution (most clauses are `None`). Re-check tau on a few fully-labelled contracts before relying on it.
- LegalBench: not used for training here. Use its CUAD-derived and contract tasks (`nguha/legalbench` on Hugging Face, e.g. `cuad_*`, `contract_nli_*`) as an **out-of-distribution eval** of the adapter versus the base model; wire it in the same way as `calibrate.py` (build prompt -> label logits -> accuracy). The dataset's exact task/column names should be checked on the Hub before use.

## 4. Model and fine-tuning

| Model | Params | License | Comment |
|---|---|---|---|
| **Qwen2.5-7B-Instruct** (default) | 7B | Apache-2.0 | Strong instruction following, 32k context, single-token letters, permissive for commercial use |
| Llama 3 8B Instruct | 8B | Llama license | Comparable quality; license terms need review |
| Mistral 7B Instruct | 7B | Apache-2.0 | Solid, slightly older |
| Phi-3 Mini (3.8B) | 3.8B | MIT | Cheapest to serve; expect lower accuracy on nuanced clauses |

Fine-tuning: QLoRA (NF4 4-bit base, LoRA r=16, alpha=32, all attention + MLP projections, lr 2e-4, 1 epoch), loss on the answer token only. Summaries use the **base** model zero-shot (CUAD has no reference summaries). To fine-tune summarization too, distil ~1-2k summaries from a stronger model, have lawyers spot-check, then add a second task to the training mix.

## 5. Confidence calibration and escalation

1. Take the logits of the first answer token restricted to the 13 label letters.
2. **Temperature scaling**: fit one scalar T on the validation split by minimizing NLL (`calibrate.fit_temperature`); report ECE before/after.
3. Confidence = max softmax(logits/T); margin = top-1 minus top-2.
4. Threshold tau = lowest value whose auto-accepted validation predictions reach the target accuracy (default 95%).
5. Escalate if confidence < tau, or margin < 0.15, or a High-risk prediction has confidence < max(tau, 0.90).
6. Metrics to watch on test: accuracy on auto-handled clauses, coverage (share not escalated), and the share of true High-risk clauses that are **silently wrong**.

Upgrades: conformal prediction sets for coverage guarantees; ensembling several LoRA seeds; token-level entropy for the generated summaries.

## 6. Limitations

- The category-to-risk mapping is a heuristic in `common.LABELS`; real risk depends on which party your client is. Have a lawyer own that table.
- Extractive PDF only; scanned documents need OCR first. Multi-column layouts may need better extraction.
- Outputs are decision support for lawyers, not legal advice.
- Code was written to be run on a GPU machine and has not been benchmarked here; expect to tune batch size, sample cap and thresholds.
