/**
 * Contract Risk Report Preview Page (Section 17)
 */

const ReportView = {
  render(container) {
    const contract = State.currentContract || (State.contracts.length > 0 ? State.contracts[0] : null);
    if (!contract) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No contract available for report</div>
          <button class="btn-primary" onclick="window.location.hash = '#contracts'">Select Contract</button>
        </div>
      `;
      return;
    }

    const clauses = contract.clauses || [];
    const highRiskClauses = clauses.filter(c => c.risk === 'High');
    const priorityIssues = highRiskClauses.slice(0, 5);
    const ambiguousClauses = clauses.filter(c => c.escalate);
    const reviewedClauses = clauses.filter(c => c.human_status !== 'pending');

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Contract Risk Intelligence Report</h1>
          <p class="view-subtitle">Executive legal summary prepared for leadership, procurement, and compliance review.</p>
        </div>
        <div class="view-actions">
          <button class="btn-secondary" onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Print / Save as PDF</span>
          </button>
          <button class="btn-primary" onclick="App.openContract('${contract.id}')">
            <span>Explore Clauses in Interactive Studio →</span>
          </button>
        </div>
      </div>

      <!-- Printable Document Sheet -->
      <div class="card report-sheet" style="padding: 36px 40px; background: #ffffff; max-width: 1000px; margin: 0 auto; box-shadow: var(--shadow-md);">
        
        <!-- Report Letterhead Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid var(--text-primary); margin-bottom: 28px;">
          <div>
            <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--brand-primary); margin-bottom: 4px;">
              ClauseGuard AI • Legal Intelligence Audit
            </div>
            <h1 style="font-size: 26px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">
              ${contract.filename}
            </h1>
            <div style="font-size: 13.5px; color: var(--text-muted);">
              Counterparty: <strong>${contract.counterparty}</strong> • Type: <strong>${contract.contract_type}</strong>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 12px; color: var(--text-muted);">Date Generated:</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">October 7, 2026</div>
            <span class="badge ${contract.overall_risk === 'HIGH' ? 'badge-risk-high' : 'badge-risk-med'}" style="font-size: 12px; padding: 4px 12px;">
              ● ${contract.overall_risk} OVERALL RISK
            </span>
          </div>
        </div>

        <!-- Section 1: Executive Summary -->
        <div style="margin-bottom: 28px;">
          <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 4px; height: 16px; background: var(--brand-accent); border-radius: 2px;"></span>
            1. Executive Summary
          </h2>
          <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            ClauseGuard AI completed a risk scan across all <strong>${contract.total_clauses} clauses</strong> in this agreement using the calibrated Qwen SLM model. 
            The document is categorized as <strong>${contract.overall_risk} RISK</strong> due to the presence of <strong>${contract.high_risk_count} high-risk provisions</strong>, including uncapped indemnification obligations and broad limitation of liability terms. A total of <strong>${contract.escalated_count} clauses</strong> triggered human review escalation criteria.
          </p>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f8fafc; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Total Clauses Scanned</div>
              <div style="font-size: 20px; font-weight: 800;">${contract.total_clauses}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">High-Risk Clauses</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--risk-high);">${contract.high_risk_count}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Escalated for Review</div>
              <div style="font-size: 20px; font-weight: 800; color: #b45309;">${contract.escalated_count}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Model Mean Confidence</div>
              <div style="font-size: 20px; font-weight: 800; color: #059669;">${(contract.avg_confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <!-- Section 2: Priority Issues (Top 5 Highest Risk Clauses) -->
        <div style="margin-bottom: 28px;">
          <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 4px; height: 16px; background: var(--risk-high); border-radius: 2px;"></span>
            2. Priority Contractual Issues
          </h2>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${priorityIssues.map(issue => `
              <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
                    ${issue.title}
                  </div>
                  <span class="badge badge-risk-high">● HIGH RISK (${(issue.confidence * 100).toFixed(1)}% Conf)</span>
                </div>

                <div style="background: #fafaf9; border-left: 3px solid #ef4444; padding: 10px 14px; font-family: Georgia, serif; font-size: 13px; color: #1c1917; line-height: 1.6; margin-bottom: 10px;">
                  "${issue.text}"
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12.5px;">
                  <div style="background: #f8fafc; padding: 10px; border-radius: 4px;">
                    <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Plain-English Summary:</div>
                    <div style="color: var(--text-secondary);">${issue.summary}</div>
                  </div>
                  <div style="background: #fffdf5; border: 1px solid #fef3c7; padding: 10px; border-radius: 4px;">
                    <div style="font-weight: 700; color: #92400e; margin-bottom: 2px;">Recommended Review Focus:</div>
                    <div style="color: #78350f;">${issue.review_focus}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 3: Ambiguous Clauses Escalated to Counsel -->
        <div style="margin-bottom: 28px;">
          <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 4px; height: 16px; background: #eab308; border-radius: 2px;"></span>
            3. Clauses Escalated for Human Legal Review
          </h2>

          <table class="data-table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>Clause</th>
                <th>Category</th>
                <th>Confidence</th>
                <th>Margin</th>
                <th>Escalation Rationale</th>
              </tr>
            </thead>
            <tbody>
              ${ambiguousClauses.map(ac => `
                <tr>
                  <td><strong>${ac.title}</strong></td>
                  <td>${ac.category}</td>
                  <td>${(ac.confidence * 100).toFixed(1)}%</td>
                  <td>${ac.margin.toFixed(2)}</td>
                  <td style="color: #991b1b;">${(ac.reasons || []).join('; ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Section 4: Audit & Sign-off Footer -->
        <div style="padding-top: 20px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
          <div>
            Reviewed by: <strong>Sarah Jenkins (Lead Legal Counsel)</strong> • Apex Global Partners LLP
          </div>
          <div>
            🔒 Private & Confidential • Generated locally on-premise
          </div>
        </div>
      </div>
    `;
  }
};
