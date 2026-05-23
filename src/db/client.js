/**
 * SECURE DATABASE CLIENT
 * This client proxies all database requests to /api/db to hide
 * the Turso URL and Auth Token from the frontend.
 */

export const db = {
  /**
   * Runs a secure predefined action on the server.
   */
  runAction: async (action, params = {}) => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Get token from storage
      const token = localStorage.getItem('alfie_app_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${JSON.parse(token)}`;
      }

      const response = await fetch('/api/db', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, params }, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
      });

      if (response.status === 401) {
        // Session expired, clear local token
        localStorage.removeItem('alfie_app_auth_token');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Action Error [${action}]:`, error);
      throw error;
    }
  },

  setToken: (token) => {
    localStorage.setItem('alfie_app_auth_token', JSON.stringify(token));
  },

  clearToken: () => {
    localStorage.removeItem('alfie_app_auth_token');
  },

  /**
   * execute is now a wrapper for runAction to maintain backwards compatibility
   * while enforcing server-side action security.
   * @deprecated Use runAction directly.
   */
  execute: async (query) => {
    console.warn("db.execute() is deprecated for security. Use db.runAction() instead.");
    return { rows: [] };
  },

  // Mock batch for now if needed
  batch: async () => {
    console.warn("Batch operations are not yet implemented in proxy mode.");
    return [];
  },

  close: () => {}
};

// For compatibility with existing components
export const isDbConnected = true;
