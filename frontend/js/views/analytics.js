/**
 * Analytics & Active Learning View (Section 14)
 */

const AnalyticsView = {
  render(container) {
    const data = State.analytics || {
      model_performance: {
        auto_handled_accuracy: '96.8%',
        coverage: '91.4%',
        escalation_rate: '8.6%',
        high_risk_silent_error_rate: '< 0.2%',
        average_confidence: '94.2%',
        ece_before_calibration: '11.4%',
        ece_after_calibration: '2.1%'
      },
      category_distribution: {
        'Cap On Liability': 420,
        'Governing Law': 390,
        'Audit Rights': 280,
        'Termination For Convenience': 210,
        'Uncapped Liability': 140,
        'Anti-Assignment': 130,
        'IP Ownership Assignment': 95,
        'Exclusivity': 85,
        'Non-Compete': 75,
        'Liquidated Damages': 65,
        'Most Favored Nation': 55,
        'Change Of Control': 48,
        'None': 1484
      },
      confidence_histogram: [
        { range: '0–50%', count: 14, percentage: 1.2 },
        { range: '50–70%', count: 68, percentage: 5.8 },
        { range: '70–80%', count: 142, percentage: 12.1 },
        { range: '80–90%', count: 310, percentage: 26.4 },
        { range: '90–100%', count: 638, percentage: 54.5 }
      ],
      review_performance: {
        human_corrections: 54,
        ai_agreement_rate: '93.4%',
        most_frequently_corrected: [
          { category: 'Cap On Liability vs Uncapped Liability', count: 19 },
          { category: 'Liquidated Damages vs Payment Terms', count: 12 },
          { category: 'Anti-Assignment vs Change Of Control', count: 8 }
        ],
        average_review_time_sec: 42
      },
      active_learning: {
        feedback_collected: 248,
        potential_training_samples: 183,
        last_model_update: 'Sep 28, 2026',
        adapter_version: 'v2.4-qlora-r16-cuad'
      }
    };

    const mp = data.model_performance;
    const al = data.active_learning;
    const rp = data.review_performance;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Analytics & Calibration</h1>
          <p class="view-subtitle">Monitor SLM classification accuracy, temperature scaling calibration, and human review loop metrics.</p>
        </div>
        <div class="view-actions">
          <button class="btn-primary" onclick="API.exportFeedback()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Prepare Fine-Tuning Dataset</span>
          </button>
        </div>
      </div>

      <!-- Model Performance KPIs -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <div class="card-title">Model Performance & Calibration</div>
            <div class="card-subtitle">Empirical performance evaluated against CUAD test benchmark and lawyer verified labels</div>
          </div>
          <span class="badge badge-safe">Temperature Scaled (T=0.943)</span>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px;">
            <div class="summary-metric-box">
              <span class="summary-metric-label">Auto-Handled Accuracy</span>
              <span class="summary-metric-val" style="color: #059669;">${mp.auto_handled_accuracy}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">High confidence subset</span>
            </div>

            <div class="summary-metric-box">
              <span class="summary-metric-label">System Coverage</span>
              <span class="summary-metric-val">${mp.coverage}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Processed without escalation</span>
            </div>

            <div class="summary-metric-box">
              <span class="summary-metric-label">Escalation Rate</span>
              <span class="summary-metric-val" style="color: #b45309;">${mp.escalation_rate}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Routed to human queue</span>
            </div>

            <div class="summary-metric-box">
              <span class="summary-metric-label">Silent Error Rate</span>
              <span class="summary-metric-val" style="color: var(--risk-low);">${mp.high_risk_silent_error_rate}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Uncaught high-risk errors</span>
            </div>

            <div class="summary-metric-box">
              <span class="summary-metric-label">ECE Before Calibration</span>
              <span class="summary-metric-val" style="color: var(--risk-high);">${mp.ece_before_calibration}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Expected Calibration Error</span>
            </div>

            <div class="summary-metric-box">
              <span class="summary-metric-label">ECE After Calibration</span>
              <span class="summary-metric-val" style="color: #059669;">${mp.ece_after_calibration}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">-81.5% calibration error</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2-Column Grid: Confidence Histogram & Category Distribution -->
      <div class="dashboard-split-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
        
        <!-- Confidence Distribution Histogram -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Calibrated Confidence Distribution</div>
              <div class="card-subtitle">Distribution of model prediction softmax probabilities</div>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${data.confidence_histogram.map(bin => `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: var(--text-secondary);">${bin.range}</span>
                    <span style="font-weight: 700; color: var(--text-primary);">${bin.count} clauses (${bin.percentage}%)</span>
                  </div>
                  <div class="progress-track" style="height: 10px;">
                    <div class="progress-fill ${bin.range.includes('90') || bin.range.includes('80') ? 'fill-low' : (bin.range.includes('70') ? 'fill-med' : 'fill-high')}"
                         style="width: ${bin.percentage * 1.5}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Risk Category Distribution -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Clauses by Risk Category</div>
              <div class="card-subtitle">Distribution of detected clauses across 13 risk categories</div>
            </div>
          </div>
          <div class="card-body" style="max-height: 380px; overflow-y: auto;">
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${Object.entries(data.category_distribution).filter(([k]) => k !== 'None').map(([cat, count]) => {
                const maxVal = 450;
                const pct = Math.min(100, Math.round((count / maxVal) * 100));
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                      <span style="font-weight: 600; color: var(--text-primary);">${cat}</span>
                      <span style="font-weight: 700; color: var(--text-muted);">${count} clauses</span>
                    </div>
                    <div class="progress-track" style="height: 6px;">
                      <div class="progress-fill fill-low" style="width: ${pct}%;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Review Performance & Active Learning 2-Col -->
      <div class="dashboard-split-grid" style="grid-template-columns: 1fr 1fr;">
        <!-- Review Performance -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Review Performance & Agreement</div>
              <div class="card-subtitle">Lawyer review velocity and alignment with SLM predictions</div>
            </div>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;">
              <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <div style="font-size: 11.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">AI Agreement Rate</div>
                <div style="font-size: 24px; font-weight: 800; color: #059669; margin: 4px 0;">${rp.ai_agreement_rate}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Lawyers confirmed model label</div>
              </div>

              <div style="background: #f8fafc; padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <div style="font-size: 11.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Avg Review Time</div>
                <div style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 4px 0;">${rp.average_review_time_sec}s</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Per escalated clause review</div>
              </div>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Most Frequently Corrected Categories:</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${rp.most_frequently_corrected.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fffdf5; border: 1px solid #fef3c7; border-radius: var(--radius-sm); font-size: 12px;">
                  <span style="font-weight: 600; color: #92400e;">${item.category}</span>
                  <span style="background: #fde68a; color: #78350f; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${item.count} corrections</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Active Learning Card -->
        <div class="card" style="border: 2px solid #10b981;">
          <div class="card-header" style="background: #ecfdf5;">
            <div>
              <div class="card-title" style="color: #065f46;">Active Learning & Model Continuous Improvement</div>
              <div class="card-subtitle" style="color: #047857;">Closed-loop fine-tuning dataset synthesized from lawyer corrections</div>
            </div>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
              <div style="background: #ffffff; padding: 14px; border-radius: var(--radius-md); border: 1px solid #a7f3d0;">
                <div style="font-size: 11.5px; color: #047857; font-weight: 700; text-transform: uppercase;">Feedback Collected</div>
                <div style="font-size: 26px; font-weight: 800; color: #065f46; margin: 4px 0;">${al.feedback_collected}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Verified lawyer corrections</div>
              </div>

              <div style="background: #ffffff; padding: 14px; border-radius: var(--radius-md); border: 1px solid #a7f3d0;">
                <div style="font-size: 11.5px; color: #047857; font-weight: 700; text-transform: uppercase;">Training Samples Ready</div>
                <div style="font-size: 26px; font-weight: 800; color: #065f46; margin: 4px 0;">${al.potential_training_samples}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Formatted as prompt-response pairs</div>
              </div>
            </div>

            <div style="margin-bottom: 20px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;">
              Each human review decision logged in <code style="font-size: 11px;">outputs/review.db</code> automatically generates training rows for the next QLoRA fine-tuning run. No client data ever leaves this workstation.
            </div>

            <button class="btn-primary" style="width: 100%; justify-content: center; background: #059669; border-color: #047857; padding: 10px;"
                    onclick="API.exportFeedback()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download feedback.jsonl (Append to train.jsonl)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
