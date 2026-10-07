/**
 * Review Queue View for ClauseGuard AI (Section 12)
 */

const ReviewQueueView = {
  activeTab: 'all', // 'all' | 'critical' | 'attention' | 'ambiguous'
  activeFilter: 'all',

  render(container) {
    const items = State.reviewQueue || [];
    let filtered = [...items];

    if (this.activeTab === 'critical') {
      filtered = filtered.filter(it => it.priority === 'Critical');
    } else if (this.activeTab === 'attention') {
      filtered = filtered.filter(it => it.priority === 'Attention Required');
    } else if (this.activeTab === 'ambiguous') {
      filtered = filtered.filter(it => it.priority === 'Ambiguous');
    }

    if (this.activeFilter === 'high_risk') {
      filtered = filtered.filter(it => it.risk === 'High');
    } else if (this.activeFilter === 'low_conf') {
      filtered = filtered.filter(it => it.confidence < 0.88);
    } else if (this.activeFilter === 'low_margin') {
      filtered = filtered.filter(it => it.margin < 0.15);
    } else if (this.activeFilter === 'assigned_me') {
      filtered = filtered.filter(it => it.assigned_to === 'Sarah Jenkins');
    }

    const criticalCount = items.filter(it => it.priority === 'Critical').length;
    const attentionCount = items.filter(it => it.priority === 'Attention Required').length;
    const ambiguousCount = items.filter(it => it.priority === 'Ambiguous').length;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Review Queue</h1>
          <p class="view-subtitle">Clauses requiring human attention before automated processing can be trusted.</p>
        </div>
        <div class="view-actions">
          <button class="btn-primary" onclick="window.location.hash = '#review-mode'" ${items.length === 0 ? 'disabled' : ''}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>Start Focused Review (${items.length})</span>
          </button>
        </div>
      </div>

      <!-- Priority Segment Tabs -->
      <div class="card" style="margin-bottom: 20px;">
        <div style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div class="filter-tabs">
            <button class="filter-tab ${this.activeTab === 'all' ? 'active' : ''}" onclick="ReviewQueueView.setTab('all')">
              All Pending (${items.length})
            </button>
            <button class="filter-tab ${this.activeTab === 'critical' ? 'active' : ''}" onclick="ReviewQueueView.setTab('critical')">
              🔴 Critical (${criticalCount})
            </button>
            <button class="filter-tab ${this.activeTab === 'attention' ? 'active' : ''}" onclick="ReviewQueueView.setTab('attention')">
              🟠 Attention Required (${attentionCount})
            </button>
            <button class="filter-tab ${this.activeTab === 'ambiguous' ? 'active' : ''}" onclick="ReviewQueueView.setTab('ambiguous')">
              🟡 Ambiguous Margin (${ambiguousCount})
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="chip-btn ${this.activeFilter === 'all' ? 'active' : ''}" onclick="ReviewQueueView.setFilter('all')">All</button>
            <button class="chip-btn ${this.activeFilter === 'high_risk' ? 'active' : ''}" onclick="ReviewQueueView.setFilter('high_risk')">High Risk</button>
            <button class="chip-btn ${this.activeFilter === 'low_conf' ? 'active' : ''}" onclick="ReviewQueueView.setFilter('low_conf')">Low Confidence</button>
            <button class="chip-btn ${this.activeFilter === 'low_margin' ? 'active' : ''}" onclick="ReviewQueueView.setFilter('low_margin')">Low Margin</button>
            <button class="chip-btn ${this.activeFilter === 'assigned_me' ? 'active' : ''}" onclick="ReviewQueueView.setFilter('assigned_me')">Assigned to Me</button>
          </div>
        </div>
      </div>

      <!-- Queue Cards List -->
      ${filtered.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="empty-state-title">You're all caught up</div>
            <div class="empty-state-desc">No clauses currently require human attention in this category.</div>
          </div>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${filtered.map((item, idx) => `
            <div class="card" style="transition: transform 0.15s, box-shadow 0.15s; border-left: 4px solid ${item.priority === 'Critical' ? 'var(--risk-high)' : (item.priority === 'Ambiguous' ? '#eab308' : '#f97316')};">
              <div class="card-body" style="padding: 18px 22px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 16px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span class="badge ${item.risk === 'High' ? 'badge-risk-high' : 'badge-risk-med'}">
                        ${item.risk === 'High' ? '🔴 HIGH RISK' : '🟠 MEDIUM RISK'}
                      </span>
                      <span class="badge ${item.priority === 'Critical' ? 'badge-risk-high' : 'badge-needs-review'}">
                        Priority: ${item.priority}
                      </span>
                      <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">
                        ${item.contract_filename || item.contract_title} • ${item.title || item.category}
                      </span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                      Model classification: <strong>${item.category}</strong> • Calibrated Conf: <strong>${(item.confidence * 100).toFixed(1)}%</strong> • Margin: <strong>${(item.margin || 0.11).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-primary" style="padding: 6px 14px; font-size: 12.5px;"
                            onclick="ReviewQueueView.startReviewAt(${idx})">
                      Review →
                    </button>
                  </div>
                </div>

                <!-- Original Clause Snippet -->
                <div style="background: #fafaf9; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; font-family: Georgia, serif; font-size: 13.5px; color: #1c1917; line-height: 1.6; margin-bottom: 12px;">
                  "${item.text}"
                </div>

                <!-- Metadata & Escalation Reasons Strip -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12px;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="color: #991b1b; font-weight: 600;">Escalation Reasons:</span>
                    ${(item.reasons || []).map(r => `
                      <span style="background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                        ${r}
                      </span>
                    `).join('')}
                  </div>

                  <div style="color: var(--text-muted); display: flex; align-items: center; gap: 14px;">
                    <span>Assigned: <strong>${item.assigned_to || 'Sarah Jenkins'}</strong></span>
                    <span>Pending: <strong>14m ago</strong></span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  setTab(tab) {
    this.activeTab = tab;
    this.render(document.getElementById('view-content'));
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render(document.getElementById('view-content'));
  },

  startReviewAt(index) {
    State.setReviewIndex(index);
    window.location.hash = '#review-mode';
  }
};
