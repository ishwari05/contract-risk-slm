/**
 * Dashboard View for ClauseGuard AI
 */

const DashboardView = {
  render(container) {
    const kpis = State.analytics ? State.analytics.kpis : {
      contracts_analyzed: 128,
      clauses_reviewed: 3482,
      high_risk_clauses: 74,
      pending_human_review: 18,
      auto_handled_percentage: 91.4
    };

    const contracts = State.contracts.slice(0, 5);
    const pendingItems = State.reviewQueue.slice(0, 3);

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Good morning, Sarah</h1>
          <p class="view-subtitle">Review contract risk, prioritize ambiguous clauses, and keep your legal workflow moving.</p>
        </div>
        <div class="view-actions">
          <button class="btn-secondary" onclick="window.location.hash = '#review-queue'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span>View Review Queue (${kpis.pending_human_review})</span>
          </button>
        </div>
      </div>

      <!-- KPI Cards Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Contracts Analyzed</span>
            <span class="kpi-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              </svg>
            </span>
          </div>
          <div class="kpi-number">${kpis.contracts_analyzed.toLocaleString()}</div>
          <div class="kpi-meta">
            <span class="trend-badge-up">↑ 12%</span>
            <span>vs previous month</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Clauses Reviewed</span>
            <span class="kpi-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </span>
          </div>
          <div class="kpi-number">${kpis.clauses_reviewed.toLocaleString()}</div>
          <div class="kpi-meta">
            <span>Across 8 agreement types</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">High-Risk Clauses</span>
            <span class="kpi-icon-wrap" style="color: var(--risk-high); background: var(--risk-high-bg);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
          </div>
          <div class="kpi-number" style="color: var(--risk-high);">${kpis.high_risk_clauses}</div>
          <div class="kpi-meta">
            <span class="trend-badge-warn">2.1%</span>
            <span>flagged critical</span>
          </div>
        </div>

        <div class="kpi-card" style="border-color: #fde68a; background: #fffdf5;">
          <div class="kpi-top">
            <span class="kpi-title" style="color: #92400e;">Pending Human Review</span>
            <span class="kpi-icon-wrap" style="color: #b45309; background: #fef3c7;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
          </div>
          <div class="kpi-number" style="color: #b45309;">${kpis.pending_human_review}</div>
          <div class="kpi-meta">
            <span style="color: #92400e; font-weight: 600;">Action required</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-title">Auto-Handled</span>
            <span class="kpi-icon-wrap" style="color: var(--risk-low); background: var(--risk-low-bg);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </span>
          </div>
          <div class="kpi-number" style="color: var(--risk-low);">${kpis.auto_handled_percentage}%</div>
          <div class="kpi-meta">
            <span class="trend-badge-up">High confidence</span>
            <span>automation</span>
          </div>
        </div>
      </div>

      <!-- Split Grid: Risk Overview & Triage Queue -->
      <div class="dashboard-split-grid">
        <!-- Risk Overview Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Risk Overview</div>
              <div class="card-subtitle">Aggregated risk classification across workspace contracts</div>
            </div>
            <span class="badge badge-risk-high">Calibrated SLM</span>
          </div>
          <div class="card-body">
            <div class="risk-overview-flex">
              <!-- SVG Donut Chart -->
              <div class="donut-chart-container">
                <svg width="170" height="170" viewBox="0 0 170 170">
                  <circle cx="85" cy="85" r="70" fill="none" stroke="#f1f5f9" stroke-width="22"/>
                  <!-- None 52.8% (stroke-dasharray 232 440, offset 0) -->
                  <circle cx="85" cy="85" r="70" fill="none" stroke="var(--risk-none)" stroke-width="22"
                          stroke-dasharray="232 440" stroke-dashoffset="0" transform="rotate(-90 85 85)"/>
                  <!-- Low 21.6% (stroke-dasharray 95 440, offset -232) -->
                  <circle cx="85" cy="85" r="70" fill="none" stroke="var(--risk-low)" stroke-width="22"
                          stroke-dasharray="95 440" stroke-dashoffset="-232" transform="rotate(-90 85 85)"/>
                  <!-- Med 17.4% (stroke-dasharray 76 440, offset -327) -->
                  <circle cx="85" cy="85" r="70" fill="none" stroke="var(--risk-med)" stroke-width="22"
                          stroke-dasharray="76 440" stroke-dashoffset="-327" transform="rotate(-90 85 85)"/>
                  <!-- High 8.2% (stroke-dasharray 37 440, offset -403) -->
                  <circle cx="85" cy="85" r="70" fill="none" stroke="var(--risk-high)" stroke-width="22"
                          stroke-dasharray="37 440" stroke-dashoffset="-403" transform="rotate(-90 85 85)"/>
                </svg>
                <div class="donut-inner-text">
                  <div class="donut-inner-label">Total Clauses</div>
                  <div class="donut-inner-val">${kpis.clauses_reviewed.toLocaleString()}</div>
                </div>
              </div>

              <!-- Risk Distribution List -->
              <div class="risk-distribution-list">
                <div class="risk-bar-row">
                  <div class="risk-bar-meta">
                    <span class="risk-bar-label"><span style="color: var(--risk-high)">●</span> High Risk</span>
                    <span class="risk-bar-pct">8.2% (285 clauses)</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill fill-high" style="width: 8.2%;"></div></div>
                </div>

                <div class="risk-bar-row">
                  <div class="risk-bar-meta">
                    <span class="risk-bar-label"><span style="color: var(--risk-med)">●</span> Medium Risk</span>
                    <span class="risk-bar-pct">17.4% (605 clauses)</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill fill-med" style="width: 17.4%;"></div></div>
                </div>

                <div class="risk-bar-row">
                  <div class="risk-bar-meta">
                    <span class="risk-bar-label"><span style="color: var(--risk-low)">●</span> Low Risk</span>
                    <span class="risk-bar-pct">21.6% (752 clauses)</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill fill-low" style="width: 21.6%;"></div></div>
                </div>

                <div class="risk-bar-row">
                  <div class="risk-bar-meta">
                    <span class="risk-bar-label"><span style="color: var(--risk-none)">●</span> None / Boilerplate</span>
                    <span class="risk-bar-pct">52.8% (1,840 clauses)</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill fill-none" style="width: 52.8%;"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Review Queue Priority Triage -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Pending Human Review</div>
              <div class="card-subtitle">Ambiguous or high-risk clauses requiring lawyer sign-off</div>
            </div>
            <a href="#review-queue" style="font-size: 12.5px; font-weight: 600; color: var(--brand-primary); text-decoration: none;">View All →</a>
          </div>
          <div class="card-body" style="padding: 16px;">
            ${pendingItems.length === 0 ? `
              <div class="empty-state" style="padding: 30px 10px;">
                <div class="empty-state-title" style="font-size: 14px;">You're all caught up</div>
                <div class="empty-state-desc" style="font-size: 12px; margin-bottom: 0;">No clauses currently require human attention.</div>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${pendingItems.map(item => `
                  <div style="background: #fafaf9; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; cursor: pointer; transition: all 0.15s;"
                       onclick="window.location.hash = '#review-mode'">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span class="badge ${item.risk === 'High' ? 'badge-risk-high' : 'badge-risk-med'}">${item.risk} Risk</span>
                      <span style="font-size: 11px; color: var(--text-muted);">Conf: ${(item.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                      ${item.contract_filename || item.contract_title || 'Agreement'} • ${item.title || item.category}
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      "${item.text}"
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Recent Contracts Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Contracts</div>
            <div class="card-subtitle">Contracts processed and indexed in your local workspace</div>
          </div>
          <a href="#contracts" style="font-size: 12.5px; font-weight: 600; color: var(--brand-primary); text-decoration: none;">View All Contracts →</a>
        </div>
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
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr class="clickable" onclick="App.openContract('${c.id}')">
                  <td>
                    <div class="contract-cell-name">
                      <div class="file-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
