"""Streamlit dashboard:  streamlit run app.py"""
import streamlit as st

import store
from common import LABELS
from infer import ClauseAnalyzer, analyze_document, extract_pdf_text

st.set_page_config(page_title="Contract Risk Review", layout="wide")
store.init()
ICON = {"High": "🔴", "Medium": "🟠", "Low": "🟡", "None": "⚪"}
CATS = [v[0] for v in LABELS.values()]
NAME2LETTER = {v[0]: k for k, v in LABELS.items()}


@st.cache_resource(show_spinner="Loading model...")
def get_analyzer():
    return ClauseAnalyzer()


an = get_analyzer()
st.title("Contract Clause Risk Review")
st.caption("On-prem SLM · risk flagging + summaries · low-confidence clauses go to a lawyer. "
           "Decision support only, not legal advice.")

with st.sidebar:
    st.header("Input")
    up = st.file_uploader("Contract (PDF or TXT)", type=["pdf", "txt"])
    tau = st.slider("Escalation confidence threshold", 0.50, 0.99, float(an.tau), 0.01,
                    help="Clauses below this calibrated confidence go to the human queue.")
    go = st.button("Analyze", type="primary", disabled=up is None)

if go and up:
    raw = up.read()
    text = extract_pdf_text(raw) if up.name.lower().endswith(".pdf") else raw.decode("utf-8", "ignore")
    if not text.strip():
        st.error("No extractable text (scanned PDF?). Run OCR first.")
    else:
        bar = st.progress(0.0, text="Classifying clauses...")
        res = analyze_document(an, text, tau=tau, progress=lambda f: bar.progress(f, text="Classifying clauses..."))
        bar.empty()
        store.add_escalations(up.name, res)
        st.session_state["res"], st.session_state["doc"] = res, up.name

tab1, tab2, tab3 = st.tabs(["Analysis", "Human review queue", "Feedback export"])

with tab1:
    res = st.session_state.get("res")
    if not res:
        st.info("Upload a contract and click Analyze.")
    else:
        flagged = [r for r in res if r["category"] != "None"]
        c = st.columns(5)
        c[0].metric("Clauses scanned", len(res))
        c[1].metric("High risk", sum(r["risk"] == "High" for r in flagged))
        c[2].metric("Medium", sum(r["risk"] == "Medium" for r in flagged))
        c[3].metric("Low", sum(r["risk"] == "Low" for r in flagged))
        c[4].metric("Escalated", sum(r["escalate"] for r in res))
        show = st.multiselect("Show risk levels", ["High", "Medium", "Low"], default=["High", "Medium", "Low"])
        only_esc = st.checkbox("Only escalated")
        order = {"High": 0, "Medium": 1, "Low": 2}
        for r in sorted([r for r in flagged if r["risk"] in show], key=lambda r: order[r["risk"]]):
            if only_esc and not r["escalate"]:
                continue
            tag = " ⚠️ needs human review" if r["escalate"] else ""
            with st.expander(f"{ICON[r['risk']]} {r['risk']} · {r['category']} · conf {r['confidence']:.0%}{tag}"):
                st.progress(min(1.0, r["confidence"]))
                st.markdown(f"**Summary:** {r['summary']}")
                if r["reasons"]:
                    st.warning("Escalation reasons: " + "; ".join(r["reasons"]))
                st.caption("Top-3: " + ", ".join(f"{n} ({p:.2f})" for n, p in r["top3"]))
                st.text(r["text"])

with tab2:
    items = store.pending()
    st.write(f"{len(items)} clause(s) awaiting review (lowest confidence first)")
    for it in items:
        with st.container(border=True):
            st.markdown(f"**{it['doc']}** · model says **{it['model_category']}** "
                        f"({it['confidence']:.0%})")
            st.caption("; ".join(__import__("json").loads(it["reasons"])))
            if it["summary"]:
                st.markdown(f"_Model summary:_ {it['summary']}")
            st.text(it["clause"])
            col1, col2, col3 = st.columns([2, 3, 1])
            label = col1.selectbox("Correct category", CATS, index=CATS.index(it["model_category"]),
                                   key=f"cat{it['id']}")
            note = col2.text_input("Comment (optional)", key=f"note{it['id']}")
            if col3.button("Submit", key=f"ok{it['id']}"):
                store.resolve(it["id"], NAME2LETTER[label], note)
                st.rerun()

with tab3:
    st.write("Reviewer decisions:", store.counts())
    data = store.export_feedback_jsonl()
    st.download_button("Download feedback.jsonl (append to train.jsonl and re-train)",
                       data or "", "feedback.jsonl", disabled=not data)
