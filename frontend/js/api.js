/**
 * API client for ClauseGuard AI SaaS Platform
 */

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: res.statusText };
        }
        throw new Error(errData.detail || errData.title || `Request failed (${res.status})`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  async getContracts(filter, search) {
    let q = '';
    const params = new URLSearchParams();
    if (filter && filter !== 'all') params.append('filter', filter);
    if (search) params.append('search', search);
    const queryString = params.toString();
    return this.request(`/contracts${queryString ? '?' + queryString : ''}`);
  },

  async getContract(id) {
    return this.request(`/contracts/${id}`);
  },

  async getContractClauses(id, risk, escalate) {
    const params = new URLSearchParams();
    if (risk) params.append('risk', risk);
    if (escalate !== undefined) params.append('escalate', escalate);
    const qs = params.toString();
    return this.request(`/contracts/${id}/clauses${qs ? '?' + qs : ''}`);
  },

  async uploadContract(file, tau) {
    const formData = new FormData();
    formData.append('file', file);
    if (tau) formData.append('tau', tau);

    const res = await fetch(`${this.baseUrl}/contracts/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw err;
    }
    return await res.json();
  },

  async reanalyzeContract(id, tau) {
    return this.request(`/contracts/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tau }),
    });
  },

  async getReviewQueue(priority) {
    const q = priority ? `?priority=${encodeURIComponent(priority)}` : '';
    return this.request(`/review-queue${q}`);
  },

  async submitReviewDecision(clauseId, decision) {
    return this.request(`/review/${clauseId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });
  },

  async getAnalytics() {
    return this.request('/analytics');
  },

  async getModelStatus() {
    return this.request('/model/status');
  },

  async getSettings() {
    return this.request('/settings');
  },

  async updateSettings(data) {
    return this.request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getReport(contractId) {
    return this.request(`/reports/${contractId}`);
  },

  async exportFeedback() {
    window.location.href = `${this.baseUrl}/active-learning/export`;
  }
};
