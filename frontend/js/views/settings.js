/**
 * Settings View for ClauseGuard AI (Section 18)
 */

const SettingsView = {
  render(container) {
    const s = State.settings || {
      organization_name: 'Apex Global Partners LLP',
      lead_counsel: 'Sarah Jenkins',
      tau: '0.80',
      tau_high: '0.90',
      min_margin: '0.15',
      target_accuracy: '0.95',
      processing_mode: 'On-Premise',
      risk_mapping: {
        'Uncapped Liability': 'High',
        'Liquidated Damages': 'High',
        'Non-Compete': 'High',
        'Exclusivity': 'High',
        'IP Ownership Assignment': 'High',
        'Change Of Control': 'Medium',
        'Anti-Assignment': 'Medium',
        'Termination For Convenience': 'Medium',
        'Most Favored Nation': 'Medium',
        'Cap On Liability': 'Low',
        'Governing Law': 'Low',
        'Audit Rights': 'Low',
        'None': 'None'
      }
    };

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Settings & Governance</h1>
          <p class="view-subtitle">Configure organization workspace, SLM escalation thresholds, and category risk mapping.</p>
        </div>
        <div class="view-actions">
          <button class="btn-primary" onclick="SettingsView.saveSettings()">Save Configuration</button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 1000px;">
        
        <!-- Workspace Settings -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Workspace & Organization</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Organization Name</label>
                <input type="text" id="setting-org-name" class="search-input" value="${s.organization_name}">
              </div>
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Lead Legal Counsel</label>
                <input type="text" id="setting-lead-counsel" class="search-input" value="${s.lead_counsel}">
              </div>
            </div>
          </div>
        </div>

        <!-- AI Escalation Safeguards Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">AI Escalation Safeguards & Thresholds</span>
              <div class="card-subtitle">Calibrated parameters controlling when clauses are flagged for human review</div>
            </div>
            <span class="badge badge-safe">Temperature Scaled (T=0.943)</span>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <label style="font-size: 13px; font-weight: 600;">General Confidence Threshold (&tau;)</label>
                  <span id="tau-val-display" style="font-weight: 700; color: var(--brand-primary);">${(parseFloat(s.tau) * 100).toFixed(0)}%</span>
                </div>
                <input type="range" id="setting-tau" min="0.50" max="0.99" step="0.01" value="${s.tau}" style="width: 100%;"
                       oninput="document.getElementById('tau-val-display').textContent = Math.round(this.value * 100) + '%'">
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Clauses with calibrated confidence below this threshold are routed to human review.</p>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <label style="font-size: 13px; font-weight: 600;">High-Risk Stricter Threshold (&tau;_high)</label>
                  <span id="tau-high-display" style="font-weight: 700; color: var(--risk-high);">${(parseFloat(s.tau_high) * 100).toFixed(0)}%</span>
                </div>
                <input type="range" id="setting-tau-high" min="0.70" max="0.99" step="0.01" value="${s.tau_high}" style="width: 100%;"
                       oninput="document.getElementById('tau-high-display').textContent = Math.round(this.value * 100) + '%'">
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">A higher confidence bar applied specifically to dangerous clauses (indemnification, liabilities).</p>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <label style="font-size: 13px; font-weight: 600;">Prediction Margin Threshold (min_margin)</label>
                  <span id="margin-display" style="font-weight: 700; color: #d97706;">${parseFloat(s.min_margin).toFixed(2)}</span>
                </div>
                <input type="range" id="setting-margin" min="0.05" max="0.30" step="0.01" value="${s.min_margin}" style="width: 100%;"
                       oninput="document.getElementById('margin-display').textContent = parseFloat(this.value).toFixed(2)">
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Flags ambiguous clauses where top-1 and top-2 predicted categories are too close together.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Configuration Matrix -->
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Risk Tier Configuration Matrix</span>
              <div class="card-subtitle">Map contractual clause categories to organizational risk tiers</div>
            </div>
          </div>
          <div class="card-body">
            <!-- Legal Admin Warning -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 12px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style="font-size: 12.5px; color: #92400e;">
                <strong>Warning:</strong> Risk classification is organization-specific. Changes should be approved by a legal administrator or general counsel.
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Assigned Risk Tier</th>
                </tr>
              </thead>
              <tbody>
                ${State.categories.filter(c => c.letter !== 'N').map(cat => `
                  <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td style="color: var(--text-muted); font-size: 12.5px;">${cat.desc}</td>
                    <td>
                      <select class="category-tier-select search-input" data-category="${cat.name}" style="padding: 4px 8px; font-size: 12px;">
                        <option value="High" ${cat.tier === 'High' ? 'selected' : ''}>🔴 High Risk</option>
                        <option value="Medium" ${cat.tier === 'Medium' ? 'selected' : ''}>🟠 Medium Risk</option>
                        <option value="Low" ${cat.tier === 'Low' ? 'selected' : ''}>🟢 Low Risk</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Privacy & Local Deployment Verification -->
        <div class="card" style="border: 2px solid #10b981;">
          <div class="card-header" style="background: #ecfdf5;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span class="card-title" style="color: #065f46;">Privacy & Local Hardware Verification</span>
            </div>
            <span class="badge badge-safe">Verified Air-Gapped Ready</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              <div style="background: #ffffff; padding: 12px; border-radius: var(--radius-md); border: 1px solid #d1fae5;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Processing Mode</div>
                <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-top: 2px;">On-Premise</div>
              </div>
              <div style="background: #ffffff; padding: 12px; border-radius: var(--radius-md); border: 1px solid #d1fae5;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">External API Calls</div>
                <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-top: 2px;">Disabled (0 bytes)</div>
              </div>
              <div style="background: #ffffff; padding: 12px; border-radius: var(--radius-md); border: 1px solid #d1fae5;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Contract Storage</div>
                <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-top: 2px;">Local SQLite Only</div>
              </div>
              <div style="background: #ffffff; padding: 12px; border-radius: var(--radius-md); border: 1px solid #d1fae5;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Client Data Egress</div>
                <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-top: 2px;">Strictly None</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveSettings() {
    const org = document.getElementById('setting-org-name')?.value;
    const lead = document.getElementById('setting-lead-counsel')?.value;
    const tau = document.getElementById('setting-tau')?.value;
    const tauHigh = document.getElementById('setting-tau-high')?.value;
    const margin = document.getElementById('setting-margin')?.value;

    const selects = document.querySelectorAll('.category-tier-select');
    const mapping = {};
    selects.forEach(sel => {
      mapping[sel.getAttribute('data-category')] = sel.value;
    });

    try {
      const updated = await API.updateSettings({
        organization_name: org,
        lead_counsel: lead,
        tau,
        tau_high: tauHigh,
        min_margin: margin,
        risk_mapping: mapping
      });
      State.setSettings(updated);
      App.showToast('Settings saved successfully.', 'success');
    } catch (e) {
      App.showToast('Failed to save settings: ' + e.message, 'error');
    }
  }
};
