"""Shared config, label space, prompt template and contract segmentation."""
import os
import re

BASE_MODEL = os.getenv("BASE_MODEL", "Qwen/Qwen2.5-7B-Instruct")  # Apache-2.0
ADAPTER_DIR = os.getenv("ADAPTER_DIR", "outputs/lora_adapter")
CALIB_PATH = os.getenv("CALIB_PATH", "outputs/calibration.json")
DATA_DIR = os.getenv("DATA_DIR", "data")

# letter -> (CUAD category, risk tier, short description used in the prompt)
# The risk tiers are a HEURISTIC starting point: have a lawyer review/adjust them
# (real risk depends on which side of the contract your client is on).
LABELS = {
    "A": ("Uncapped Liability", "High", "liability with no upper limit / unlimited indemnity"),
    "B": ("Liquidated Damages", "High", "pre-agreed penalty or fixed damages payable on breach"),
    "C": ("Non-Compete", "High", "restricts a party from competing or dealing with competitors"),
    "D": ("Exclusivity", "High", "exclusive dealing, exclusive supply/purchase or exclusive rights"),
    "E": ("IP Ownership Assignment", "High", "assigns or transfers ownership of IP / work product"),
    "F": ("Change Of Control", "Medium", "consent, termination or fees triggered by acquisition / change of control"),
    "G": ("Anti-Assignment", "Medium", "consent required to assign or transfer the contract"),
    "H": ("Termination For Convenience", "Medium", "right to terminate without cause"),
    "I": ("Most Favored Nation", "Medium", "most-favored-customer / pricing parity commitments"),
    "J": ("Cap On Liability", "Low", "limits or caps the amount of liability"),
    "K": ("Governing Law", "Low", "which jurisdiction's law governs the contract"),
    "L": ("Audit Rights", "Low", "right to audit or inspect books and records"),
    "N": ("None", "None", "none of the above / boilerplate / unrelated text"),
}
LETTERS = list(LABELS)
CATEGORY_TO_LETTER = {v[0].lower(): k for k, v in LABELS.items() if k != "N"}
RISK_RANK = {"High": 3, "Medium": 2, "Low": 1, "None": 0}

SYSTEM = (
    "You are a contract review assistant for a law firm. Classify the contract "
    "passage into exactly one category. Answer with the single category letter only."
)


def build_messages(clause: str):
    options = "\n".join(f"{k}: {v[0]} - {v[2]}" for k, v in LABELS.items())
    user = (
        f"Categories:\n{options}\n\nPassage:\n\"\"\"\n{clause}\n\"\"\"\n\n"
        "Answer with one letter."
    )
    return [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]


def build_prompt(tokenizer, clause: str) -> str:
    return tokenizer.apply_chat_template(
        build_messages(clause), tokenize=False, add_generation_prompt=True
    )


def segment_contract(text: str, min_words: int = 60, max_words: int = 220, drop_below: int = 8):
    """Split contract text into clause-sized chunks. Returns [(start, end)] char offsets.

    Paragraph split on blank lines -> oversized paragraphs are cut into word windows ->
    tiny paragraphs (headings, short sub-clauses) are merged with their neighbours.
    """
    paras, pos = [], 0
    for part in re.split(r"(\n\s*\n)", text):
        if part.strip():
            paras.append((pos, pos + len(part)))
        pos += len(part)

    pieces = []
    for s, e in paras:
        words = list(re.finditer(r"\S+", text[s:e]))
        if len(words) <= max_words:
            pieces.append((s, e, len(words)))
        else:
            for i in range(0, len(words), max_words):
                w = words[i:i + max_words]
                pieces.append((s + w[0].start(), s + w[-1].end(), len(w)))

    chunks, cur = [], None
    for s, e, n in pieces:
        if cur is None:
            cur = [s, e, n]
        elif cur[2] < min_words and cur[2] + n <= max_words:
            cur[1], cur[2] = e, cur[2] + n
        else:
            chunks.append(tuple(cur))
            cur = [s, e, n]
    if cur:
        chunks.append(tuple(cur))
    return [(s, e) for s, e, n in chunks if n >= drop_below]
