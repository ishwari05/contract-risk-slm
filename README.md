# ClauseGuard AI

**An Enterprise-Grade, On-Premise AI Contract Review & Risk Intelligence Platform**

ClauseGuard AI is a domain-adapted Small Language Model (SLM) pipeline and web application designed for automated contract clause risk-flagging and summarization. Built for lawyers, legal teams, and compliance professionals, it offers confidence-calibrated escalation of ambiguous clauses to human reviewers. 

**Privacy First**: Fully on-premise. No client text ever leaves your machine.

---

## 1. Features & Capabilities

- **Intelligent Risk Flagging**: Classifies clauses into 13 distinct risk categories (e.g., Liability, Indemnification, Governing Law).
- **Risk Tiers**: Automatically assigns High, Medium, or Low risk levels to extracted clauses.
- **Confidence Calibration**: Uses temperature scaling to generate calibrated confidence scores.
- **Smart Escalation**: Triages clauses with low confidence, low margin, or high-risk implications to a human lawyer review queue.
- **Zero-Shot Summarization**: Generates concise, plain-English summaries of complex legal clauses.
- **Active Learning**: Learns from human corrections through a local SQLite-backed feedback loop (`feedback.jsonl`) for continuous LoRA fine-tuning.
- **Modern SaaS UI**: A polished, responsive, and professional frontend interface replacing traditional prototype dashboards.

---

## 2. System Architecture

```text
 PDF Contract
     |
     v
 [1] Text Extraction (PyMuPDF blocks -> paragraphs)         infer.extract_pdf_text
     |
     v
 [2] Clause Segmentation (blank-line paras, 60-220 words)   common.segment_contract
     |
     v
 [3] SLM Classifier: Qwen2.5-7B-Instruct + QLoRA adapter    infer.ClauseAnalyzer
     (One forward pass per clause -> logits over 13 labels)
     |
     v
 [4] Calibration: softmax(logits / T) -> confidence, margin infer.decide
     |
     +--> Risk Tier = lookup(category) (High / Medium / Low)
     |
     +--> Escalate? conf < tau | margin < 0.15 | High-risk & conf < tau_high
               |                                   
               v yes                               
           [5] Lawyer Review Queue (FastAPI + SQLite)      backend/main.py, backend/database.py
               |                                   
               v (Lawyer corrects/approves via UI)                                   
           feedback.jsonl -> Next fine-tuning round (Active Learning Loop)
               
               v no
           [6] Zero-Shot Summary (Adapter disabled)
               |
               v
           ClauseGuard AI Web Application (FastAPI + HTML/CSS/JS Frontend)
```

**Key ML Design Choice**: The classifier answers with a **single letter token** (A-L, N), ensuring the model's next-token distribution is a proper class-probability vector. No brittle text parsing is required, and calibration is reduced to a clean 1-parameter problem.

---

## 3. Setup and Run Instructions

### Prerequisites
- NVIDIA GPU with ~16GB+ VRAM (e.g., RTX 4090, Colab T4) for 7B QLoRA.
- Python 3.10+

### Installation & Training

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download CUAD Dataset
# Download CUAD_v1.zip from atticusprojectai.org/cuad and unzip -> CUAD_v1.json

# 3. Prepare Data
python data_prep.py --cuad CUAD_v1/CUAD_v1.json     # Generates data/{train,val,test}.jsonl

# 4. Train LoRA Adapter (GPU, 4-bit)
python train_lora.py                                # Generates outputs/lora_adapter

# 5. Calibrate Confidence Thresholds
python calibrate.py --target_acc 0.95               # Generates outputs/calibration.json
```

*(Tip: To iterate faster on lower-end hardware, change `BASE_MODEL=Qwen/Qwen2.5-1.5B-Instruct` in the scripts.)*

### Running the Application

ClauseGuard AI uses a FastAPI backend and a custom HTML/JS frontend (no longer Streamlit).

```bash
# Start the FastAPI Server
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Then navigate to `http://127.0.0.1:8000` in your browser.

---

## 4. Data Processing (CUAD)

- **Source**: CUAD ships as SQuAD-style JSON (510 contracts x 41 questions).
- **Segmentation**: Contracts are cut into clause-sized chunks. Each gold answer span is assigned to the chunk containing its midpoint. A chunk with several categories keeps the highest-risk one (simplifying to single-label).
- **Splits**: By contract (80/10/10) to strictly avoid data leakage.
- **Balancing**: The train set is rebalanced (1:1 negatives) and capped at 6,000 samples. Val/test keep 3:1 negatives.
- **Caveat**: Because val/test are rebalanced, the fitted threshold may be optimistic on real contracts (where most clauses are `None`). Re-check `tau` on a fully-labeled contract before relying on it in production.

---

## 5. Model Details

| Model | Params | License | Comment |
|---|---|---|---|
| **Qwen2.5-7B-Instruct** (default) | 7B | Apache-2.0 | Strong instruction following, 32k context, single-token letters, permissive for commercial use |
| Llama 3 8B Instruct | 8B | Llama license | Comparable quality; license terms need review |
| Mistral 7B Instruct | 7B | Apache-2.0 | Solid, slightly older |
| Phi-3 Mini (3.8B) | 3.8B | MIT | Cheapest to serve; expect lower accuracy on nuanced clauses |

**Fine-Tuning Process**: QLoRA (NF4 4-bit base, LoRA r=16, alpha=32, all attention + MLP projections, lr 2e-4, 1 epoch), computing loss on the single answer token only. 

**Summaries**: Handled zero-shot using the **base** model (adapter disabled). 

---

## 6. Confidence Calibration & Escalation

1. Take the logits of the first answer token restricted to the 13 label letters.
2. **Temperature scaling**: Fit one scalar `T` on the validation split by minimizing NLL.
3. Confidence = `max softmax(logits/T)`; Margin = `top-1` minus `top-2`.
4. Threshold `tau` = lowest value whose auto-accepted validation predictions reach the target accuracy (default 95%).
5. **Escalation Trigger**: Escalate if `confidence < tau`, OR `margin < 0.15`, OR a High-risk prediction has `confidence < max(tau, 0.90)`.

---

## 7. Limitations & Disclaimers

- **Risk Mapping**: The category-to-risk mapping (`common.LABELS`) is a heuristic. Real risk depends on which party your client is representing. Have a qualified lawyer review and own that mapping table.
- **PDF Extraction**: Extractive PDF only. Scanned documents require a separate OCR pipeline first.
- **Not Legal Advice**: Outputs are decision-support tools for lawyers, **not** automated legal advice.
- **Performance Tuning**: Expect to tune batch sizes, sample caps, and thresholds depending on your specific hardware and risk tolerance.
