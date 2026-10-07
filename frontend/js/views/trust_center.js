/**
 * Trust & Privacy Center View (Section 22)
 */

const TrustCenterView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Trust, Security & Privacy Center</h1>
          <p class="view-subtitle">ClauseGuard AI is engineered for air-gapped enterprise legal compliance. Your documents never leave your machine.</p>
        </div>
        <div class="view-actions">
          <span class="badge badge-safe" style="padding: 6px 14px; font-size: 13px;">
            🔒 Certified On-Premise Operation
          </span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 1000px;">
        
        <!-- Big Trust Banner -->
        <div class="card" style="border: 2px solid #10b981; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);">
          <div class="card-body" style="padding: 28px 32px;">
            <div style="display: flex; align-items: flex-start; gap: 20px;">
              <div style="width: 52px; height: 52px; border-radius: var(--radius-lg); background: #d1fae5; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div>
                <h2 style="font-size: 20px; font-weight: 800; color: #065f46; margin-bottom: 6px;">
                  "Your contracts stay on your machine."
                </h2>
                <p style="font-size: 14.5px; color: #047857; line-height: 1.6;">
                  Enterprise legal departments cannot tolerate client confidential agreements, trade secrets, and non-public M&A terms being transmitted to cloud LLM APIs. ClauseGuard AI executes 100% of PDF extraction, clause segmentation, token logits computation, and calibrated risk inference directly on your local workstation GPU.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 6 Pillars of Trust Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">🔌</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Zero Cloud API Egress</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                No prompts, embeddings, or completions are sent to OpenAI, Anthropic, or external cloud servers. All network egress is 0 bytes.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">⚡</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Local Hardware Inference</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Powered by a domain-adapted Qwen SLM running on local NVIDIA hardware with 4-bit NF4 quantized weights and low-latency response.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">🛡️</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Human-in-the-Loop Safeguard</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Decision support only, not autonomous legal advice. Any ambiguous or high-risk clause below calibrated confidence is routed to a human attorney.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">💾</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Local SQLite Persistence</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Contract text, review queue states, and feedback items reside strictly in your local <code style="font-size: 11px;">outputs/review.db</code> database.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">🎓</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Private Active Learning</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Lawyer feedback is retained locally in <code style="font-size: 11px;">outputs/feedback.jsonl</code>. Your firm's proprietary corrections train only your internal models.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <div style="font-size: 18px; margin-bottom: 10px;">📜</div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Audit Trail & Reproducibility</h3>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Every prediction includes reproducible temperature-calibrated softmax logits, ranking margins, and human approval timestamps.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
