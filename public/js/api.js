// MapMapMap API Client
const API = {
  baseURL: '/api',

  async request(method, path, data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${this.baseURL}${path}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth APIs
  auth: {
    async signup(email, password, nickname) {
      return API.request('POST', '/auth/signup', { email, password, nickname });
    },

    async login(email, password) {
      return API.request('POST', '/auth/login', { email, password });
    },

    async logout() {
      return API.request('POST', '/auth/logout');
    },

    async me() {
      return API.request('GET', '/auth/me');
    },

    async setSpicyLevel(spicy_level) {
      return API.request('PUT', '/auth/spicy-level', { spicy_level });
    }
  },

  // Restaurant APIs
  restaurants: {
    async list() {
      return API.request('GET', '/restaurants');
    },

    async get(id) {
      return API.request('GET', `/restaurants/${id}`);
    },

    async create(data) {
      return API.request('POST', '/restaurants', data);
    }
  },

  // Review APIs
  reviews: {
    async create(formData) {
      // FormData for file upload - different handling
      const response = await fetch(`${API.baseURL}/reviews`, {
        method: 'POST',
        credentials: 'include',
        body: formData // No Content-Type header for FormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Review creation failed');
      }

      return result;
    },

    async myList() {
      return API.request('GET', '/reviews/my');
    }
  },

  // Admin APIs
  admin: {
    async getReviews(status = '') {
      const query = status ? `?status=${status}` : '';
      return API.request('GET', `/admin/reviews${query}`);
    },

    async getStats() {
      return API.request('GET', '/admin/stats');
    },

    async approve(id) {
      return API.request('PUT', `/admin/reviews/${id}/approve`);
    },

    async reject(id, reason) {
      return API.request('PUT', `/admin/reviews/${id}/reject`, { reason });
    }
  },

  // Favorites (찜하기) APIs
  favorites: {
    async list() {
      return API.request('GET', '/favorites');
    },

    async check(restaurantId) {
      return API.request('GET', `/favorites/check/${restaurantId}`);
    },

    async add(restaurantId) {
      return API.request('POST', `/favorites/${restaurantId}`);
    },

    async remove(restaurantId) {
      return API.request('DELETE', `/favorites/${restaurantId}`);
    }
  }
};

// Global state
const AppState = {
  user: null,
  restaurants: [],
  isLoading: false,

  setUser(user) {
    this.user = user;
    this.updateUI();
  },

  updateUI() {
    // Update header user info
    const headerUserInfo = document.getElementById('header-user-info');
    const headerNickname = document.getElementById('header-nickname');
    const headerLevel = document.getElementById('header-level');
    const authButtons = document.getElementById('auth-buttons');
    const adminBtn = document.getElementById('admin-btn');

    if (this.user) {
      if (headerUserInfo) {
        headerUserInfo.style.display = 'flex';
        headerNickname.textContent = this.user.nickname;
        headerLevel.textContent = `Lv.${this.user.spicy_level}`;
        headerLevel.className = `user-level-badge level-${this.user.spicy_level}`;
      }
      if (authButtons) authButtons.style.display = 'none';
      // 관리자 버튼 표시/숨김
      if (adminBtn) {
        adminBtn.style.display = this.user.is_admin ? 'inline-block' : 'none';
      }
    } else {
      if (headerUserInfo) headerUserInfo.style.display = 'none';
      if (authButtons) authButtons.style.display = 'flex';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }
};

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10001;
    animation: fadeIn 0.3s ease;
    background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#333'};
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
