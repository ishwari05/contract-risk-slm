/**
 * Main Application Orchestrator for ClauseGuard AI SaaS Platform
 */

const App = {
  async init() {
    console.log("Initializing ClauseGuard AI...");

    // Event listeners for navigation & UI
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // Sidebar collapse
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
      if (e.key === 'Escape') {
        this.closeUploadModal();
      }
    });

    // Back to contracts button
    document.getElementById('topbar-back-btn')?.addEventListener('click', () => {
      window.location.hash = '#contracts';
    });

    // Upload modal openers and closers
    document.getElementById('open-upload-btn')?.addEventListener('click', () => this.openUploadModal());
    document.getElementById('close-upload-modal-btn')?.addEventListener('click', () => this.closeUploadModal());
    document.getElementById('upload-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'upload-modal') this.closeUploadModal();
    });

    // Drop zone setup
    this.setupDropZone();

    // Sample contract buttons in modal
    document.querySelectorAll('.sample-load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const docId = e.currentTarget.getAttribute('data-doc');
        this.loadSampleContract(docId);
      });
    });

    // Global Search listener
    document.getElementById('global-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q && window.location.hash !== '#contracts') {
        window.location.hash = '#contracts';
      }
      if (window.location.hash === '#contracts') {
        ContractsView.onSearch(q);
      }
    });

    // Initial Data Fetch
    await this.fetchInitialData();

    // Run initial route
    this.handleRouting();
  },

  async fetchInitialData() {
    try {
      const [contracts, reviewQueue, analytics, modelStatus, settings] = await Promise.all([
        API.getContracts(),
        API.getReviewQueue(),
        API.getAnalytics(),
        API.getModelStatus(),
        API.getSettings()
      ]);

      State.setContracts(contracts);
      State.setReviewQueue(reviewQueue);
      State.setAnalytics(analytics);
      State.setModelStatus(modelStatus);
      State.setSettings(settings);

      // Default current contract to first contract (Acme Supplier Agreement)
      if (contracts.length > 0 && !State.currentContract) {
        const full = await API.getContract(contracts[0].id);
        State.setCurrentContract(full);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
      this.showToast("Connected in offline preview mode.", "info");
    }
  },

  handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const [path, query] = hash.split('?');
    const viewName = path.replace('#', '') || 'dashboard';

    // Parse query params if any (e.g. #analysis?id=...)
    let queryParams = {};
    if (query) {
      const sp = new URLSearchParams(query);
      for (const [k, v] of sp.entries()) queryParams[k] = v;
    }

    // Update sidebar active states
    document.querySelectorAll('.nav-item').forEach(item => {
      const targetView = item.getAttribute('data-view');
      item.classList.toggle('active', targetView === viewName);
    });

    // Update breadcrumb and back button
    const breadcrumbPage = document.getElementById('breadcrumb-page');
    const backBtn = document.getElementById('topbar-back-btn');
    
    if (breadcrumbPage) {
      const titles = {
        'dashboard': 'Dashboard',
        'contracts': 'Contracts',
        'analysis': 'Clause Explorer',
        'review-queue': 'Review Queue',
        'review-mode': 'Focused Review',
        'analytics': 'Analytics',
        'feedback': 'Feedback & Active Learning',
        'transparency': 'AI Transparency',
        'trust': 'Trust & Privacy',
        'settings': 'Settings',
        'report': 'Risk Intelligence Report'
      };
      breadcrumbPage.textContent = titles[viewName] || 'Overview';
    }

    if (backBtn) {
      backBtn.style.display = ['analysis', 'report', 'review-mode'].includes(viewName) ? 'inline-flex' : 'none';
    }

    const container = document.getElementById('view-content');
    if (!container) return;

    // Render corresponding view
    switch (viewName) {
      case 'dashboard':
        DashboardView.render(container);
        break;
      case 'contracts':
        ContractsView.render(container);
        break;
      case 'analysis':
        if (queryParams.id && (!State.currentContract || State.currentContract.id !== queryParams.id)) {
          this.loadContractById(queryParams.id);
        } else {
          ClauseExplorerView.render(container);
        }
        break;
      case 'review-queue':
        ReviewQueueView.render(container);
        break;
      case 'review-mode':
        ReviewModeView.render(container);
        break;
      case 'analytics':
      case 'feedback':
        AnalyticsView.render(container);
        break;
      case 'transparency':
        TransparencyView.render(container);
        break;
      case 'trust':
        TrustCenterView.render(container);
        break;
      case 'settings':
        SettingsView.render(container);
        break;
      case 'report':
        ReportView.render(container);
        break;
      default:
        DashboardView.render(container);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async openContract(contractId) {
    await this.loadContractById(contractId);
    window.location.hash = `#analysis?id=${contractId}`;
  },

  async openReport(contractId) {
    if (contractId && (!State.currentContract || State.currentContract.id !== contractId)) {
      const full = await API.getContract(contractId);
      State.setCurrentContract(full);
    }
    window.location.hash = '#report';
  },

  async loadContractById(contractId) {
    try {
      const full = await API.getContract(contractId);
      State.setCurrentContract(full);
      const container = document.getElementById('view-content');
      if (window.location.hash.startsWith('#analysis')) {
        ClauseExplorerView.render(container);
      }
    } catch (e) {
      this.showToast('Failed to load contract: ' + e.message, 'error');
    }
  },

  async reloadCurrentContract() {
    if (State.currentContractId) {
      const full = await API.getContract(State.currentContractId);
      State.setCurrentContract(full);
      const queue = await API.getReviewQueue();
      State.setReviewQueue(queue);
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
  },

  openUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
      modal.classList.add('open');
      // Reset drop zone view
      document.getElementById('contract-drop-zone').style.display = 'block';
      document.getElementById('upload-workflow-container').style.display = 'none';
    }
  },

  closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.remove('open');
  },

  setupDropZone() {
    const dropZone = document.getElementById('contract-drop-zone');
    const fileInput = document.getElementById('file-input-element');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) this.handleFileUpload(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
    });
  },

  async handleFileUpload(file) {
    const dropZone = document.getElementById('contract-drop-zone');
    const workflow = document.getElementById('upload-workflow-container');

    dropZone.style.display = 'none';
    workflow.style.display = 'block';

    const stages = [
      { step: 1, text: "Uploading document...", pct: 15 },
      { step: 2, text: "Extracting text...", pct: 30 },
      { step: 3, text: "Detecting clauses...", pct: 45 },
      { step: 4, text: "Running risk analysis...", pct: 65 },
      { step: 5, text: "Calibrating confidence...", pct: 80 },
      { step: 6, text: "Generating summaries...", pct: 92 },
      { step: 7, text: "Preparing review queue...", pct: 100 }
    ];

    const progressBar = document.getElementById('workflow-progress-bar');
    const stageText = document.getElementById('workflow-current-stage');
    const pctText = document.getElementById('workflow-pct');

    // Run progressive UI animations
    for (let i = 0; i < stages.length - 1; i++) {
      const s = stages[i];
      stageText.textContent = s.text;
      pctText.textContent = `${s.pct}%`;
      progressBar.style.width = `${s.pct}%`;
      this.updatePipelineStep(s.step);
      await new Promise(r => setTimeout(r, 450));
    }

    try {
      const result = await API.uploadContract(file);

      // Complete last stage
      const finalStage = stages[stages.length - 1];
      stageText.textContent = finalStage.text;
      pctText.textContent = "100%";
      progressBar.style.width = "100%";
      this.updatePipelineStep(finalStage.step);
      await new Promise(r => setTimeout(r, 400));

      this.closeUploadModal();
      this.showToast(`Contract "${file.name}" analyzed successfully!`, 'success');

      // Refresh data
      await this.fetchInitialData();
      await this.openContract(result.contract.id);
    } catch (err) {
      console.error("Upload/analysis failed:", err);
      workflow.style.display = 'none';
      dropZone.style.display = 'block';

      if (err.error === 'extraction_failed' || err.error === 'empty_text') {
        this.showExtractionErrorModal(err);
      } else {
        this.showToast(err.detail || err.message || 'Analysis failed. Please try another PDF.', 'error');
      }
    }
  },

  updatePipelineStep(currentStep) {
    document.querySelectorAll('.pipeline-step-item').forEach(el => {
      const step = parseInt(el.getAttribute('data-step'));
      if (step < currentStep) {
        el.className = 'pipeline-step-item completed';
        el.querySelector('.step-indicator-circle').innerHTML = '✓';
      } else if (step === currentStep) {
        el.className = 'pipeline-step-item active';
      } else {
        el.className = 'pipeline-step-item';
      }
    });
  },

  async loadSampleContract(docId) {
    this.closeUploadModal();
    this.showToast('Loading pre-indexed agreement...', 'info');
    await this.openContract(docId);
  },

  showExtractionErrorModal(err) {
    alert(`We couldn't extract text from this PDF.\n\nPossible reasons:\n- Scanned document without embedded text\n- Unsupported font encoding\n- Corrupted PDF structure\n\nActions:\n- Try another PDF\n- Run OCR pre-processing`);
  },

  exportContractsCSV() {
    const headers = ['ID', 'Filename', 'Counterparty', 'Type', 'Overall Risk', 'Clauses', 'High Risk', 'Confidence'];
    const rows = State.contracts.map(c => [
      c.id, `"${c.filename}"`, `"${c.counterparty}"`, `"${c.contract_type}"`,
      c.overall_risk, c.total_clauses, c.high_risk_count, `${(c.avg_confidence * 100).toFixed(1)}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = 'clauseguard_contracts_export.csv';
    a.click();
    this.showToast('Exported contracts to CSV', 'success');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = {
      success: '✓',
      warning: '⚠️',
      error: '✕',
      info: 'ℹ'
    };

    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };

    toast.innerHTML = `
      <span style="font-weight: 800; color: ${colors[type] || '#3b82f6'};">${icons[type] || 'ℹ'}</span>
      <span style="flex: 1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
