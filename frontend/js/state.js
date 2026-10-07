/**
 * Central State Store for ClauseGuard AI
 */

const State = {
  activeView: 'dashboard',
  contracts: [],
  currentContractId: null,
  currentContract: null,
  selectedClauseId: null,
  reviewQueue: [],
  currentReviewIndex: 0,
  analytics: null,
  modelStatus: null,
  settings: null,
  subscribers: [],

  // 13 Human-readable categories and their letter mapping
  categories: [
    { letter: 'A', name: 'Uncapped Liability', tier: 'High', desc: 'Liability with no upper limit / unlimited indemnity' },
    { letter: 'B', name: 'Liquidated Damages', tier: 'High', desc: 'Pre-agreed penalty or fixed damages on breach' },
    { letter: 'C', name: 'Non-Compete', tier: 'High', desc: 'Restricts party from competing' },
    { letter: 'D', name: 'Exclusivity', tier: 'High', desc: 'Exclusive dealing or purchase commitments' },
    { letter: 'E', name: 'IP Ownership Assignment', tier: 'High', desc: 'Assigns or transfers ownership of IP / work product' },
    { letter: 'F', name: 'Change Of Control', tier: 'Medium', desc: 'Consent or fees triggered by acquisition / M&A' },
    { letter: 'G', name: 'Anti-Assignment', tier: 'Medium', desc: 'Consent required to transfer contract' },
    { letter: 'H', name: 'Termination For Convenience', tier: 'Medium', desc: 'Right to terminate without cause' },
    { letter: 'I', name: 'Most Favored Nation', tier: 'Medium', desc: 'Best customer pricing parity' },
    { letter: 'J', name: 'Cap On Liability', tier: 'Low', desc: 'Limits or caps the amount of liability' },
    { letter: 'K', name: 'Governing Law', tier: 'Low', desc: 'Which jurisdiction governs contract' },
    { letter: 'L', name: 'Audit Rights', tier: 'Low', desc: 'Right to audit books and records' },
    { letter: 'N', name: 'None', tier: 'None', desc: 'Standard boilerplate / non-flagged text' },
  ],

  subscribe(fn) {
    this.subscribers.push(fn);
  },

  notify() {
    this.subscribers.forEach(fn => fn(this));
  },

  setView(viewName, params = {}) {
    this.activeView = viewName;
    if (params.contractId) {
      this.currentContractId = params.contractId;
    }
    if (params.clauseId) {
      this.selectedClauseId = params.clauseId;
    }
    this.notify();
  },

  setContracts(list) {
    this.contracts = list;
    this.notify();
  },

  setCurrentContract(contract) {
    this.currentContract = contract;
    this.currentContractId = contract ? contract.id : null;
    if (contract && contract.clauses && contract.clauses.length > 0) {
      // If no selected clause, default to first high-risk or first clause
      if (!this.selectedClauseId || !contract.clauses.some(c => c.id === this.selectedClauseId)) {
        const highRisk = contract.clauses.find(c => c.risk === 'High');
        this.selectedClauseId = highRisk ? highRisk.id : contract.clauses[0].id;
      }
    }
    this.notify();
  },

  setSelectedClause(clauseId) {
    this.selectedClauseId = clauseId;
    this.notify();
  },

  setReviewQueue(items) {
    this.reviewQueue = items;
    const badge = document.getElementById('sidebar-queue-badge');
    if (badge) {
      badge.textContent = items.length;
      badge.style.display = items.length > 0 ? 'inline-block' : 'none';
    }
    this.notify();
  },

  setReviewIndex(index) {
    this.currentReviewIndex = Math.max(0, Math.min(index, this.reviewQueue.length - 1));
    this.notify();
  },

  setAnalytics(data) {
    this.analytics = data;
    this.notify();
  },

  setModelStatus(status) {
    this.modelStatus = status;
    const pill = document.getElementById('system-status-pill');
    if (pill && status) {
      const label = pill.querySelector('.status-label');
      const detail = pill.querySelector('.status-detail');
      if (label) label.textContent = 'SLM Operational';
      if (detail) detail.textContent = `RTX 4090 • T=${status.temperature || '0.94'}`;
    }
    this.notify();
  },

  setSettings(settings) {
    this.settings = settings;
    this.notify();
  }
};
