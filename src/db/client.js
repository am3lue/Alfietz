/**
 * SECURE DATABASE CLIENT
 * This client proxies all database requests to /api/db to hide
 * the Turso URL and Auth Token from the frontend.
 */

export const db = {
  /**
   * Runs a secure predefined action on the server.
   * This is Level 2 security: frontend sends command name + params, never SQL.
   */
  runAction: async (action, params = {}) => {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_APP_API_KEY || ''
        },
        body: JSON.stringify({ action, params }),
      });

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

  /**
   * Proxies the execute command to the serverless backend.
   * NOTE: For Level 2 security, prefer runAction() for data modification.
   */
  execute: async (query) => {
    let sql, args;

    if (typeof query === 'string') {
      sql = query;
      args = [];
    } else {
      sql = query.sql;
      args = query.args || [];
    }

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_APP_API_KEY || ''
        },
        body: JSON.stringify({ sql, args }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server responded with ${response.status}: ${await response.text()}` };
        }
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Database Proxy Client Error:', error);
      // Return empty structure to prevent app crashes if server is down
      return { rows: [] };
    }
  },

  // Mock batch for now if needed (though not used in current codebase)
  batch: async () => {
    console.warn("Batch operations are not yet implemented in proxy mode.");
    return [];
  },

  close: () => {}
};

// For compatibility with existing components
export const isDbConnected = true;
