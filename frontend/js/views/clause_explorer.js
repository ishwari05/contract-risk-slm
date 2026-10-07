/**
 * Contract Analysis & Clause Explorer View (Two-Panel Legal Document Review)
 * Sections 7, 8, 9, 10, 11 of Specification
 */

const ClauseExplorerView = {
  activeRiskFilter: 'All',
  clauseSearchQuery: '',
  sortBy: 'order', // 'order' | 'risk' | 'confidence'
  showTechnicalDetails: false,
  showChangeCategoryModal: false,

  render(container) {
    const contract = State.currentContract;
    if (!contract) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            </svg>
          </div>
          <div class="empty-state-title">No contract selected</div>
          <div class="empty-state-desc">Choose a contract from your workspace or analyze a new document.</div>
          <button class="btn-primary" onclick="window.location.hash = '#contracts'">View Contracts</button>
        </div>
      `;
      return;
    }

    const clauses = contract.clauses || [];
    let filteredClauses = [...clauses];

    // Filter by risk or status
    if (this.activeRiskFilter === 'High Risk') {
      filteredClauses = filteredClauses.filter(c => c.risk === 'High');
    } else if (this.activeRiskFilter === 'Medium Risk') {
      filteredClauses = filteredClauses.filter(c => c.risk === 'Medium');
    } else if (this.activeRiskFilter === 'Low Risk') {
      filteredClauses = filteredClauses.filter(c => c.risk === 'Low');
    } else if (this.activeRiskFilter === 'Needs Review') {
      filteredClauses = filteredClauses.filter(c => c.escalate || c.human_status === 'pending');
    } else if (this.activeRiskFilter === 'High Confidence') {
      filteredClauses = filteredClauses.filter(c => c.confidence >= 0.90);
    } else if (this.activeRiskFilter === 'Low Confidence') {
      filteredClauses = filteredClauses.filter(c => c.confidence < 0.90);
    }

    // Search
    if (this.clauseSearchQuery) {
      const q = this.clauseSearchQuery.toLowerCase();
      filteredClauses = filteredClauses.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.text.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }

    // Sort
    if (this.sortBy === 'risk') {
      const riskWeights = { 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
      filteredClauses.sort((a, b) => (riskWeights[b.risk] || 0) - (riskWeights[a.risk] || 0));
    } else if (this.sortBy === 'confidence') {
      filteredClauses.sort((a, b) => a.confidence - b.confidence);
    } else {
      filteredClauses.sort((a, b) => a.clause_idx - b.clause_idx);
    }

    // Active clause
    let selectedClause = clauses.find(c => c.id === State.selectedClauseId) || clauses[0];

    // Prepare highlighted text
    let highlightedText = selectedClause ? selectedClause.text : '';
    if (selectedClause && selectedClause.highlighted_phrases && selectedClause.highlighted_phrases.length > 0) {
      selectedClause.highlighted_phrases.forEach(phrase => {
        if (phrase && phrase.length > 5) {
          const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          highlightedText = highlightedText.replace(new RegExp(esc, 'gi'), match => `<mark class="highlight-risk-phrase">${match}</mark>`);
        }
      });
    }

    container.innerHTML = `
      <!-- Contract Header Card -->
      <div class="analysis-header-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <h1 style="font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px;">
                ${contract.filename}
              </h1>
              <span class="badge ${contract.overall_risk === 'HIGH' ? 'badge-risk-high' : 'badge-risk-med'}">
                ● ${contract.overall_risk} OVERALL RISK
              </span>
            </div>
            <div style="font-size: 13px; color: var(--text-muted);">
              ${contract.total_clauses} clauses • Analyzed 2 minutes ago • Counterparty: ${contract.counterparty} • Governing: ${contract.governing_law}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="topbar-btn" onclick="App.openReport('${contract.id}')" title="Generate Executive PDF Report">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Download Report</span>
            </button>
            <button class="topbar-btn" onclick="ClauseExplorerView.exportJSON()" title="Export JSON Analysis">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export JSON</span>
            </button>
            <button class="topbar-btn" onclick="ClauseExplorerView.reanalyze('${contract.id}')" title="Re-run SLM inference">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Re-analyze</span>
            </button>
          </div>
        </div>

        <!-- Summary Cards Strip -->
        <div class="analysis-summary-metrics">
          <div class="summary-metric-box">
            <span class="summary-metric-label">Overall Risk</span>
            <span class="summary-metric-val" style="color: ${contract.overall_risk === 'HIGH' ? 'var(--risk-high)' : 'var(--risk-med)'};">
              ${contract.overall_risk}
            </span>
          </div>
          <div class="summary-metric-box">
            <span class="summary-metric-label">Clauses</span>
            <span class="summary-metric-val">${contract.total_clauses}</span>
          </div>
          <div class="summary-metric-box">
            <span class="summary-metric-label">High Risk</span>
            <span class="summary-metric-val" style="color: var(--risk-high);">${contract.high_risk_count}</span>
          </div>
          <div class="summary-metric-box">
            <span class="summary-metric-label">Needs Review</span>
            <span class="summary-metric-val" style="color: #b45309;">${contract.escalated_count}</span>
          </div>
          <div class="summary-metric-box">
            <span class="summary-metric-label">Average Confidence</span>
            <span class="summary-metric-val" style="color: #059669;">${(contract.avg_confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Main Workspace: Two-Panel Review Layout -->
      <div class="clause-explorer-container">
        <!-- LEFT PANEL: Clause List -->
        <div class="clause-list-panel">
          <div class="clause-list-toolbar">
            <input type="text" class="clause-search-input" placeholder="Search clauses..." value="${this.clauseSearchQuery}"
                   oninput="ClauseExplorerView.onClauseSearch(this.value)">

            <div class="clause-filter-chips">
              ${['All', 'High Risk', 'Medium Risk', 'Low Risk', 'Needs Review', 'High Confidence', 'Low Confidence'].map(f => `
                <button class="chip-btn ${this.activeRiskFilter === f ? 'active' : ''}"
                        onclick="ClauseExplorerView.setRiskFilter('${f}')">${f}</button>
              `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted);">
              <span>Showing ${filteredClauses.length} of ${clauses.length} clauses</span>
              <select style="background: transparent; border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 11px; padding: 2px 6px;"
                      onchange="ClauseExplorerView.setSort(this.value)">
                <option value="order" ${this.sortBy === 'order' ? 'selected' : ''}>Clause order</option>
                <option value="risk" ${this.sortBy === 'risk' ? 'selected' : ''}>Risk level</option>
                <option value="confidence" ${this.sortBy === 'confidence' ? 'selected' : ''}>Lowest confidence</option>
              </select>
            </div>
          </div>

          <div class="clause-scroll-list">
            ${filteredClauses.map(c => `
              <div class="clause-card-item ${selectedClause && selectedClause.id === c.id ? 'active' : ''}"
                   onclick="ClauseExplorerView.selectClause('${c.id}')">
                <div class="clause-card-header">
                  <span class="clause-card-title">${c.title}</span>
                  <span class="badge ${c.risk === 'High' ? 'badge-risk-high' : (c.risk === 'Medium' ? 'badge-risk-med' : (c.risk === 'Low' ? 'badge-risk-low' : 'badge-risk-none'))}">
                    ${c.risk === 'High' ? '🔴 HIGH' : (c.risk === 'Medium' ? '🟠 MED' : (c.risk === 'Low' ? '🟢 LOW' : '⚪ NONE'))}
                  </span>
                </div>
                <div class="clause-card-preview">${c.text}</div>
                <div class="clause-card-footer">
                  <span style="font-weight: 600; color: var(--text-secondary);">
                    Confidence: ${(c.confidence * 100).toFixed(1)}%
                  </span>
                  ${c.escalate || c.human_status === 'pending' ? `
                    <span class="badge badge-needs-review" style="font-size: 10px; padding: 1px 5px;">⚠️ Needs Review</span>
                  ` : `
                    <span class="badge badge-safe" style="font-size: 10px; padding: 1px 5px;">✓ Handled</span>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT PANEL: Clause Detail & Review Workspace -->
        <div class="clause-detail-panel">
          ${!selectedClause ? `
            <div class="empty-state">
              <div class="empty-state-title">Select a clause to inspect</div>
            </div>
          ` : `
            <!-- Clause Header -->
            <div class="clause-detail-header">
              <div>
                <h2 class="clause-title-main">${selectedClause.title}</h2>
                <div class="clause-badges-strip">
                  <span class="badge ${selectedClause.risk === 'High' ? 'badge-risk-high' : (selectedClause.risk === 'Medium' ? 'badge-risk-med' : 'badge-risk-low')}">
                    ${selectedClause.risk === 'High' ? '🔴' : (selectedClause.risk === 'Medium' ? '🟠' : '🟢')} ${selectedClause.risk.toUpperCase()} RISK
                  </span>
                  <span class="badge badge-risk-none">Category: ${selectedClause.category}</span>
                  <span class="badge badge-risk-none">Confidence: ${(selectedClause.confidence * 100).toFixed(1)}%</span>
                  <span class="badge badge-risk-none">Margin: ${selectedClause.margin.toFixed(2)}</span>
                  ${selectedClause.escalate || selectedClause.human_status === 'pending' ? `
                    <span class="badge badge-needs-review">⚠️ Needs Human Review</span>
                  ` : `
                    <span class="badge badge-safe">✓ Approved / Handled</span>
                  `}
                </div>
              </div>
              <div style="font-size: 12px; color: var(--text-muted);">
                Assigned: <strong>${selectedClause.assigned_to || 'Sarah Jenkins'}</strong>
              </div>
            </div>

            <!-- Clause Text Document Parchment Card -->
            <div class="clause-text-document-card">
              <div class="document-card-actions">
                <span class="document-label">Original Clause Text</span>
                <div style="display: flex; gap: 8px;">
                  <button class="topbar-btn" style="padding: 3px 8px; font-size: 11px;" onclick="ClauseExplorerView.copyClauseText()" title="Copy to clipboard">
                    Copy
                  </button>
                  <button class="topbar-btn" style="padding: 3px 8px; font-size: 11px;" onclick="ClauseExplorerView.toggleExpandText()" title="Toggle full text view">
                    Expand
                  </button>
                  <button class="topbar-btn" style="padding: 3px 8px; font-size: 11px;" onclick="ClauseExplorerView.addCommentModal()" title="Add lawyer internal note">
                    + Comment
                  </button>
                </div>
              </div>
              <div class="clause-original-body" id="clause-original-text-content">${highlightedText}</div>
            </div>

            <!-- AI Assessment Card -->
            <div class="ai-assessment-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>AI Assessment</span>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: var(--brand-primary);">
                  Decision: ${selectedClause.escalate ? 'Human review recommended' : 'Auto-handled with high confidence'}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; background: #ffffff; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Risk Level</div>
                  <div style="font-size: 14px; font-weight: 700; color: ${selectedClause.risk === 'High' ? 'var(--risk-high)' : 'var(--risk-med)'};">${selectedClause.risk}</div>
                </div>
                <div>
                  <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Category</div>
                  <div style="font-size: 14px; font-weight: 700;">${selectedClause.category}</div>
                </div>
                <div>
                  <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Confidence</div>
                  <div style="font-size: 14px; font-weight: 700;">${(selectedClause.confidence * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Margin</div>
                  <div style="font-size: 14px; font-weight: 700;">${selectedClause.margin.toFixed(2)}</div>
                </div>
              </div>

              ${selectedClause.escalate && selectedClause.reasons && selectedClause.reasons.length > 0 ? `
                <div class="escalation-reasons-box">
                  <div class="escalation-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Why was this clause escalated to a lawyer?</span>
                  </div>
                  <ul class="escalation-list">
                    ${selectedClause.reasons.map(r => `<li>${r}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Technical Details Expandable -->
              <div style="margin-top: 14px;">
                <button class="technical-details-toggle" onclick="ClauseExplorerView.toggleTechDetails()">
                  <span>${this.showTechnicalDetails ? '▼ Hide Technical Details' : '▶ Technical Details'}</span>
                </button>
                <div class="technical-details-content ${this.showTechnicalDetails ? 'open' : ''}">
                  <div><strong>Model:</strong> Qwen2.5-7B-Instruct + QLoRA (v2.4-cuad)</div>
                  <div><strong>Temperature T:</strong> 0.943 (calibrated via negative log-likelihood on validation split)</div>
                  <div><strong>Prediction Margin:</strong> ${selectedClause.margin.toFixed(3)} (threshold tau_margin=0.150)</div>
                  <div><strong>Top-3 Label Distribution:</strong></div>
                  <div style="padding-left: 12px; margin-top: 4px;">
                    ${(selectedClause.top3 || []).map(([cat, prob]) => `<div>• ${cat}: ${(prob * 100).toFixed(1)}%</div>`).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Plain-English AI Summary Card -->
            <div class="ai-summary-card">
              <div class="summary-heading">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Plain-English Summary</span>
              </div>
              <blockquote class="summary-blockquote">
                "${selectedClause.summary || 'Summary generated by SLM.'}"
              </blockquote>

              <div class="summary-breakdown">
                <div>
                  <div class="summary-sub-label">What this means</div>
                  <div class="summary-sub-text">${selectedClause.what_this_means || 'Operational legal implications.'}</div>
                </div>
                <div>
                  <div class="summary-sub-label">Review focus</div>
                  <div class="summary-sub-text">${selectedClause.review_focus || 'Key contractual risk items to negotiate.'}</div>
                </div>
              </div>

              <div style="font-size: 11px; color: #15803d; margin-top: 10px; font-style: italic;">
                ℹ AI-assisted summary for decision support only. Not autonomous legal advice.
              </div>
            </div>

            <!-- Human Review Workflow Action Box -->
            <div class="human-review-action-box">
              <div class="human-review-header">
                <div class="human-review-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <polyline points="17 11 19 13 23 9"/>
                  </svg>
                  <span>Lawyer Review Required</span>
                </div>
                <span style="font-size: 12px; color: var(--text-muted);">Feeds active-learning fine-tuning dataset</span>
              </div>

              <div class="review-btn-row">
                <button class="btn-approve" onclick="ClauseExplorerView.approveLabel('${selectedClause.id}')">
                  ✓ Approve AI Label
                </button>

                <button class="btn-correct" onclick="ClauseExplorerView.openChangeCategoryModal('${selectedClause.id}')">
                  ✕ Change Classification
                </button>

                <button class="btn-secondary" onclick="ClauseExplorerView.markAsSafe('${selectedClause.id}')">
                  Mark as Safe
                </button>

                <button class="btn-escalate" onclick="ClauseExplorerView.escalateClause('${selectedClause.id}')">
                  ⚠ Escalate
                </button>

                <button class="btn-secondary" onclick="ClauseExplorerView.addCommentModal()">
                  Add Comment
                </button>
              </div>

              <!-- Inline Reason for Correction (Optional) -->
              <div style="margin-top: 12px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                  Reason for correction / internal legal note:
                </label>
                <input type="text" id="review-comment-input" class="search-input" style="width: 100%;"
                       placeholder="e.g. Liability cap is unreciprocated; customer must demand mutual exclusions">
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Change Category Modal Dialog (if opened) -->
      ${this.showChangeCategoryModal ? `
        <div class="modal-backdrop open">
          <div class="modal-card" style="max-width: 480px;">
            <div class="modal-header">
              <h3 style="font-size: 16px; font-weight: 700;">Change Classification</h3>
              <button onclick="ClauseExplorerView.closeCategoryModal()" style="background: transparent; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body">
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
                Select the correct category for this clause. Your correction will feed the next QLoRA fine-tuning round.
              </p>
              <select id="new-category-select" class="search-input" style="width: 100%; margin-bottom: 16px; font-size: 13px;">
                ${State.categories.map(cat => `
                  <option value="${cat.name}" ${selectedClause.category === cat.name ? 'selected' : ''}>
                    ${cat.name} (${cat.tier} Risk) — ${cat.desc}
                  </option>
                `).join('')}
              </select>
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn-secondary" onclick="ClauseExplorerView.closeCategoryModal()">Cancel</button>
                <button class="btn-primary" onclick="ClauseExplorerView.submitCategoryChange('${selectedClause.id}')">Submit Correction</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  },

  selectClause(clauseId) {
    State.setSelectedClause(clauseId);
    this.render(document.getElementById('view-content'));
  },

  setRiskFilter(filter) {
    this.activeRiskFilter = filter;
    this.render(document.getElementById('view-content'));
  },

  onClauseSearch(q) {
    this.clauseSearchQuery = q;
    this.render(document.getElementById('view-content'));
  },

  setSort(val) {
    this.sortBy = val;
    this.render(document.getElementById('view-content'));
  },

  toggleTechDetails() {
    this.showTechnicalDetails = !this.showTechnicalDetails;
    this.render(document.getElementById('view-content'));
  },

  copyClauseText() {
    const el = document.getElementById('clause-original-text-content');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      App.showToast('Clause text copied to clipboard', 'success');
    }
  },

  toggleExpandText() {
    const el = document.getElementById('clause-original-text-content');
    if (el) {
      el.style.fontSize = el.style.fontSize === '18px' ? '15px' : '18px';
      el.style.lineHeight = el.style.fontSize === '18px' ? '2.0' : '1.7';
    }
  },

  addCommentModal() {
    const commentInput = document.getElementById('review-comment-input');
    if (commentInput) {
      commentInput.focus();
      commentInput.scrollIntoView({ behavior: 'smooth' });
    }
  },

  async approveLabel(clauseId) {
    const note = document.getElementById('review-comment-input')?.value || 'Approved as accurate by lawyer';
    try {
      await API.submitReviewDecision(clauseId, { status: 'approved', comment: note });
      App.showToast('Clause classification approved and verified.', 'success');
      // Refresh current contract
      await App.reloadCurrentContract();
    } catch (e) {
      App.showToast('Failed to approve clause: ' + e.message, 'error');
    }
  },

  async markAsSafe(clauseId) {
    try {
      await API.submitReviewDecision(clauseId, { status: 'approved', comment: 'Marked as safe / acceptable terms' });
      App.showToast('Clause marked as acceptable risk.', 'success');
      await App.reloadCurrentContract();
    } catch (e) {
      App.showToast('Failed: ' + e.message, 'error');
    }
  },

  async escalateClause(clauseId) {
    const note = document.getElementById('review-comment-input')?.value || 'Escalated to senior legal partner';
    try {
      await API.submitReviewDecision(clauseId, { status: 'escalated', comment: note });
      App.showToast('Clause escalated to Senior Legal Partner.', 'warning');
      await App.reloadCurrentContract();
    } catch (e) {
      App.showToast('Failed: ' + e.message, 'error');
    }
  },

  openChangeCategoryModal(clauseId) {
    this.showChangeCategoryModal = true;
    this.render(document.getElementById('view-content'));
  },

  closeCategoryModal() {
    this.showChangeCategoryModal = false;
    this.render(document.getElementById('view-content'));
  },

  async submitCategoryChange(clauseId) {
    const sel = document.getElementById('new-category-select');
    const newCat = sel ? sel.value : 'None';
    const note = document.getElementById('review-comment-input')?.value || 'Reclassified by legal team';
    try {
      await API.submitReviewDecision(clauseId, {
        status: 'corrected',
        category: newCat,
        comment: note
      });
      App.showToast(`Category updated to "${newCat}". Logged to active learning feedback.`, 'success');
      this.showChangeCategoryModal = false;
      await App.reloadCurrentContract();
    } catch (e) {
      App.showToast('Failed to update category: ' + e.message, 'error');
    }
  },

  exportJSON() {
    if (!State.currentContract) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(State.currentContract, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${State.currentContract.filename}_analysis.json`;
    a.click();
    App.showToast('Exported contract analysis JSON', 'success');
  },

  async reanalyze(contractId) {
    App.showToast('Re-running SLM inference on contract...', 'info');
    try {
      const res = await API.reanalyzeContract(contractId);
      State.setCurrentContract(res.contract);
      App.showToast('Re-analysis completed successfully!', 'success');
      this.render(document.getElementById('view-content'));
    } catch (e) {
      App.showToast('Re-analysis failed: ' + e.message, 'error');
    }
  }
};
