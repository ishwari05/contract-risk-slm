/**
 * Contracts List Page View for ClauseGuard AI
 */

const ContractsView = {
  activeFilter: 'all',
  searchQuery: '',

  render(container) {
    let filtered = [...State.contracts];

    if (this.activeFilter === 'needs_review') {
      filtered = filtered.filter(c => c.escalated_count > 0);
    } else if (this.activeFilter === 'high_risk') {
      filtered = filtered.filter(c => c.overall_risk === 'HIGH');
    } else if (this.activeFilter === 'completed') {
      filtered = filtered.filter(c => c.status === 'Completed');
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.filename.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.counterparty.toLowerCase().includes(q) ||
        c.contract_type.toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Contracts</h1>
          <p class="view-subtitle">Analyze, review, and track contract risk across your workspace.</p>
        </div>
        <div class="view-actions">
          <button class="btn-secondary" onclick="App.exportContractsCSV()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Filter and Search Bar -->
      <div class="card" style="margin-bottom: 20px;">
        <div style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div class="filter-tabs">
            <button class="filter-tab ${this.activeFilter === 'all' ? 'active' : ''}" onclick="ContractsView.setFilter('all')">All (${State.contracts.length})</button>
            <button class="filter-tab ${this.activeFilter === 'recently_analyzed' ? 'active' : ''}" onclick="ContractsView.setFilter('recently_analyzed')">Recently analyzed</button>
            <button class="filter-tab ${this.activeFilter === 'needs_review' ? 'active' : ''}" onclick="ContractsView.setFilter('needs_review')">Needs review (${State.contracts.filter(c => c.escalated_count > 0).length})</button>
            <button class="filter-tab ${this.activeFilter === 'high_risk' ? 'active' : ''}" onclick="ContractsView.setFilter('high_risk')">High risk (${State.contracts.filter(c => c.overall_risk === 'HIGH').length})</button>
            <button class="filter-tab ${this.activeFilter === 'completed' ? 'active' : ''}" onclick="ContractsView.setFilter('completed')">Completed (${State.contracts.filter(c => c.status === 'Completed').length})</button>
          </div>

          <div style="position: relative; width: 300px;">
            <input type="text" class="search-input" placeholder="Search contracts..." value="${this.searchQuery}"
                   oninput="ContractsView.onSearch(this.value)">
            <span class="search-icon-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>
        </div>
      </div>

      <!-- Contracts Table -->
      <div class="card">
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Status</th>
                <th>Clauses</th>
                <th>High Risk</th>
                <th>Review Required</th>
                <th>Confidence</th>
                <th>Updated</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <div class="empty-state-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </div>
                      <div class="empty-state-title">No contracts match your filter</div>
                      <div class="empty-state-desc">Try clearing your search terms or upload a new contract.</div>
                    </div>
                  </td>
                </tr>
              ` : filtered.map(c => `
                <tr class="clickable" onclick="App.openContract('${c.id}')">
                  <td>
                    <div class="contract-cell-name">
                      <div class="file-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div>
                        <div class="contract-title-txt">${c.filename}</div>
                        <div class="contract-subtitle-txt">${c.counterparty} • ${c.contract_type}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${c.status === 'Completed' ? 'badge-safe' : (c.escalated_count > 0 ? 'badge-needs-review' : 'badge-safe')}">
                      ${c.status}
                    </span>
                  </td>
                  <td><strong>${c.total_clauses}</strong></td>
                  <td>
                    <span class="badge ${c.high_risk_count > 0 ? 'badge-risk-high' : 'badge-risk-none'}">
                      ${c.high_risk_count}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${c.escalated_count > 0 ? 'badge-needs-review' : 'badge-safe'}">
                      ${c.escalated_count > 0 ? `⚠️ ${c.escalated_count}` : '✓ 0'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-track" style="width: 60px; height: 6px;">
                        <div class="progress-fill fill-low" style="width: ${(c.avg_confidence * 100).toFixed(0)}%;"></div>
                      </div>
                      <span style="font-size: 12px; font-weight: 600;">${(c.avg_confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style="color: var(--text-muted); font-size: 12.5px;">2h ago</td>
                  <td style="text-align: right;" onclick="event.stopPropagation()">
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="topbar-btn" style="padding: 4px 8px; font-size: 12px;" onclick="App.openContract('${c.id}')" title="Explore Clauses">
                        Review
                      </button>
                      <button class="topbar-btn" style="padding: 4px 8px; font-size: 12px;" onclick="App.openReport('${c.id}')" title="Executive Report">
                        Report
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render(document.getElementById('view-content'));
  },

  onSearch(query) {
    this.searchQuery = query;
    this.render(document.getElementById('view-content'));
  }
};
