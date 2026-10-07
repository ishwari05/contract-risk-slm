/**
 * Focused Distraction-Free Review Mode (Section 13)
 * 3-Column Review Interface with Keyboard-Friendly Interactions
 */

const ReviewModeView = {
  render(container) {
    const queue = State.reviewQueue;
    if (!queue || queue.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="empty-state-title">You're all caught up!</div>
            <div class="empty-state-desc">No escalated clauses currently pending human lawyer review.</div>
            <button class="btn-primary" onclick="window.location.hash = '#dashboard'">Back to Dashboard</button>
          </div>
        </div>
      `;
      return;
    }

    const curIdx = State.currentReviewIndex;
    const item = queue[curIdx] || queue[0];
    const total = queue.length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 1500px; margin: 0 auto;">
        <!-- Top Review Header -->
        <div class="card" style="padding: 12px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <button class="topbar-btn" onclick="window.location.hash = '#review-queue'">
                ← Back to Queue
              </button>
              <span style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
                ${item.contract_filename || item.contract_title}
              </span>
              <span class="badge ${item.risk === 'High' ? 'badge-risk-high' : 'badge-risk-med'}">
                ● ${item.risk} RISK
              </span>
            </div>

            <!-- Progress & Navigation -->
            <div style="display: flex; align-items: center; gap: 16px;">
              <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">
                ${curIdx + 1} of ${total} reviews
              </span>
              <div style="display: flex; gap: 6px;">
                <button class="topbar-btn" onclick="ReviewModeView.prev()" ${curIdx === 0 ? 'disabled' : ''} title="Previous (Left Arrow)">
                  ← Prev
                </button>
                <button class="topbar-btn" onclick="ReviewModeView.next()" ${curIdx === total - 1 ? 'disabled' : ''} title="Next (Right Arrow)">
                  Next →
                </button>
              </div>
            </div>

            <!-- Keyboard Shortcuts Legend -->
            <div style="display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-muted);">
              <span>Shortcuts:</span>
              <span><kbd class="search-kbd">1</kbd> Confirm</span>
              <span><kbd class="search-kbd">2</kbd> Correct</span>
              <span><kbd class="search-kbd">3</kbd> Escalate</span>
              <span><kbd class="search-kbd">←</kbd><kbd class="search-kbd">→</kbd> Nav</span>
            </div>
          </div>
        </div>

        <!-- 3-Column Distraction-Free Review Workspace -->
        <div style="display: grid; grid-template-columns: 1.1fr 1.1fr 380px; gap: 20px; min-height: 580px;">
          
          <!-- LEFT COLUMN: Original Clause -->
          <div class="card" style="display: flex; flex-direction: column;">
            <div class="card-header" style="background: #fafaf9;">
              <span class="card-title">Original Contract Clause</span>
              <button class="topbar-btn" style="padding: 2px 8px; font-size: 11px;" onclick="ReviewModeView.copyText('${item.id}')">
                Copy
              </button>
            </div>
            <div class="card-body" style="flex: 1; overflow-y: auto; background: #fafaf9; font-family: Georgia, serif; font-size: 15px; line-height: 1.8; color: #1c1917;">
              "${item.text}"
            </div>
            <div style="padding: 12px 18px; border-top: 1px solid var(--border-subtle); background: #ffffff; font-size: 11.5px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Document: ${item.contract_filename}</span>
              <span>Clause index: #${item.clause_number || item.clause_idx || curIdx + 1}</span>
            </div>
          </div>

          <!-- CENTER COLUMN: AI Prediction & Explanations -->
          <div class="card" style="display: flex; flex-direction: column; overflow-y: auto;">
            <div class="card-header">
              <span class="card-title">AI Assessment & Rationale</span>
              <span class="badge badge-risk-none">Qwen SLM (QLoRA)</span>
            </div>
            <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
              <!-- Prediction Box -->
              <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Predicted Category</span>
                  <span class="badge ${item.risk === 'High' ? 'badge-risk-high' : 'badge-risk-med'}">${item.risk} RISK</span>
                </div>
                <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
                  ${item.category}
                </div>
                <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary);">
                  <span>Calibrated Confidence: <strong>${(item.confidence * 100).toFixed(1)}%</strong></span>
                  <span>Margin: <strong>${(item.margin || 0.11).toFixed(2)}</strong></span>
                </div>
              </div>

              <!-- Escalation Reasons -->
              <div class="escalation-reasons-box" style="margin-top: 0;">
                <div class="escalation-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>Why Escalated for Human Review</span>
                </div>
                <ul class="escalation-list">
                  ${(item.reasons || []).map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>

              <!-- Plain-English Summary -->
              <div class="ai-summary-card" style="padding: 16px;">
                <div class="summary-heading" style="font-size: 13px;">Plain-English Summary</div>
                <blockquote class="summary-blockquote" style="font-size: 13px; margin-bottom: 10px;">
                  "${item.summary || 'Summary generated by SLM.'}"
                </blockquote>
                <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 2px;">Review Focus:</div>
                <div style="font-size: 12px; color: #374151;">
                  ${item.review_focus || 'Assess liability cap exclusions and notice requirements.'}
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Human Decision Panel -->
          <div class="card" style="display: flex; flex-direction: column; border: 2px solid #3b82f6;">
            <div class="card-header" style="background: #eff6ff;">
              <div>
                <span class="card-title" style="color: #1e40af;">Lawyer Decision</span>
                <div style="font-size: 11.5px; color: #3b82f6;">Sign-off & active learning feedback</div>
              </div>
            </div>

            <div class="card-body" style="display: flex; flex-direction: column; gap: 16px; flex: 1;">
              <!-- Quick Decision Buttons -->
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn-approve" style="padding: 12px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;"
                        onclick="ReviewModeView.confirm('${item.id}')">
                  <span>✓ [1] Confirm AI Label (${item.category})</span>
                </button>

                <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
                  <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                    ✕ [2] Or Reclassify As:
                  </label>
                  <select id="review-mode-cat-select" class="search-input" style="width: 100%; margin-bottom: 8px; font-size: 12.5px;">
                    ${State.categories.map(c => `
                      <option value="${c.name}" ${item.category === c.name ? 'selected' : ''}>
                        ${c.name} (${c.tier} Risk)
                      </option>
                    `).join('')}
                  </select>
                  <button class="btn-correct" style="width: 100%; padding: 8px; font-size: 12px;"
                          onclick="ReviewModeView.correct('${item.id}')">
                    Submit Correction
                  </button>
                </div>

                <button class="btn-escalate" style="padding: 10px; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;"
                        onclick="ReviewModeView.escalate('${item.id}')">
                  <span>⚠ [3] Escalate to Senior Counsel</span>
                </button>
              </div>

              <!-- Notes Textarea -->
              <div style="margin-top: auto;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Legal Review Notes (Optional):
                </label>
                <textarea id="review-mode-notes" class="search-input" style="width: 100%; height: 80px; resize: none; font-size: 12px; padding: 8px;"
                          placeholder="e.g. Uncapped liability acceptable given mutual indemnification carveouts in Section 14..."></textarea>
              </div>

              <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
                🔒 All reviewed decisions are written directly to your local SQLite store and logged to <code style="font-size: 10.5px;">outputs/feedback.jsonl</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind keyboard shortcuts
    this.bindKeyboardShortcuts(item.id);
  },

  bindKeyboardShortcuts(itemId) {
    window.onkeydown = (e) => {
      // Don't trigger if user is typing in textarea or input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === '1') {
        ReviewModeView.confirm(itemId);
      } else if (e.key === '2') {
        ReviewModeView.correct(itemId);
      } else if (e.key === '3') {
        ReviewModeView.escalate(itemId);
      } else if (e.key === 'ArrowLeft') {
        ReviewModeView.prev();
      } else if (e.key === 'ArrowRight') {
        ReviewModeView.next();
      }
    };
  },

  async confirm(itemId) {
    const note = document.getElementById('review-mode-notes')?.value || 'Confirmed by lawyer in review mode';
    try {
      await API.submitReviewDecision(itemId, { status: 'approved', comment: note });
      App.showToast('Decision saved! Verified AI label.', 'success');
      this.advanceQueue(itemId);
    } catch (e) {
      App.showToast('Failed to save decision: ' + e.message, 'error');
    }
  },

  async correct(itemId) {
    const sel = document.getElementById('review-mode-cat-select');
    const newCat = sel ? sel.value : 'None';
    const note = document.getElementById('review-mode-notes')?.value || 'Reclassified by lawyer';
    try {
      await API.submitReviewDecision(itemId, { status: 'corrected', category: newCat, comment: note });
      App.showToast(`Saved! Clause reclassified to "${newCat}".`, 'success');
      this.advanceQueue(itemId);
    } catch (e) {
      App.showToast('Failed to save correction: ' + e.message, 'error');
    }
  },

  async escalate(itemId) {
    const note = document.getElementById('review-mode-notes')?.value || 'Escalated to Senior Partner';
    try {
      await API.submitReviewDecision(itemId, { status: 'escalated', comment: note });
      App.showToast('Clause escalated to Senior Partner.', 'warning');
      this.advanceQueue(itemId);
    } catch (e) {
      App.showToast('Failed to escalate: ' + e.message, 'error');
    }
  },

  advanceQueue(itemId) {
    // Remove from local queue
    const updatedQueue = State.reviewQueue.filter(it => it.id !== itemId);
    State.setReviewQueue(updatedQueue);
    if (updatedQueue.length === 0) {
      window.location.hash = '#review-queue';
    } else {
      State.setReviewIndex(Math.min(State.currentReviewIndex, updatedQueue.length - 1));
      this.render(document.getElementById('view-content'));
    }
  },

  prev() {
    if (State.currentReviewIndex > 0) {
      State.setReviewIndex(State.currentReviewIndex - 1);
      this.render(document.getElementById('view-content'));
    }
  },

  next() {
    if (State.currentReviewIndex < State.reviewQueue.length - 1) {
      State.setReviewIndex(State.currentReviewIndex + 1);
      this.render(document.getElementById('view-content'));
    }
  },

  copyText(id) {
    const item = State.reviewQueue.find(it => it.id === id);
    if (item) {
      navigator.clipboard.writeText(item.text);
      App.showToast('Clause text copied to clipboard', 'success');
    }
  }
};
