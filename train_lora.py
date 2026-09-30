"""QLoRA fine-tuning (HF transformers + PEFT + bitsandbytes). Loss only on the answer token.

Usage:  python train_lora.py
Env:    BASE_MODEL (default Qwen/Qwen2.5-7B-Instruct), ADAPTER_DIR, DATA_DIR

Tip: Unsloth (FastLanguageModel + get_peft_model) is a drop-in ~2x faster alternative
for the model-loading block below; the data encoding and Trainer stay identical.
"""
import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,
                          DataCollatorForSeq2Seq, Trainer, TrainingArguments)

from common import ADAPTER_DIR, BASE_MODEL, DATA_DIR, build_prompt

MAX_LEN = 1024


def main():
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    tok.padding_side = "right"
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    use_bf16 = torch.cuda.is_bf16_supported()
    dtype = torch.bfloat16 if use_bf16 else torch.float16  # T4 -> fp16
    bnb = BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=dtype,
    )
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, quantization_config=bnb, device_map={"": 0}, torch_dtype=dtype
    )
    model = prepare_model_for_kbit_training(
        model, use_gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )
    model = get_peft_model(model, LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    ))
    model.print_trainable_parameters()

    def encode(ex):
        prompt_ids = tok(build_prompt(tok, ex["text"]), add_special_tokens=False)["input_ids"]
        answer_ids = tok(ex["label"] + tok.eos_token, add_special_tokens=False)["input_ids"]
        ids = prompt_ids + answer_ids
        return {
            "input_ids": ids,
            "attention_mask": [1] * len(ids),
            "labels": [-100] * len(prompt_ids) + answer_ids,  # train only on the answer
        }

    ds = load_dataset("json", data_files=f"{DATA_DIR}/train.jsonl")["train"]
    ds = ds.map(encode, remove_columns=ds.column_names)
    ds = ds.filter(lambda x: len(x["input_ids"]) <= MAX_LEN)
    print("training samples:", len(ds))

    args = TrainingArguments(
        output_dir="outputs/checkpoints",
        per_device_train_batch_size=1, gradient_accumulation_steps=16,
        learning_rate=2e-4, num_train_epochs=1, lr_scheduler_type="cosine",
        warmup_ratio=0.03, logging_steps=10, save_strategy="epoch",
        bf16=use_bf16, fp16=not use_bf16, optim="paged_adamw_8bit",
        gradient_checkpointing=True, report_to="none",
    )
    Trainer(
        model=model, args=args, train_dataset=ds,
        data_collator=DataCollatorForSeq2Seq(tok, padding=True, label_pad_token_id=-100),
    ).train()

    model.save_pretrained(ADAPTER_DIR)
    tok.save_pretrained(ADAPTER_DIR)
    print("saved adapter to", ADAPTER_DIR)


if __name__ == "__main__":
    main()
