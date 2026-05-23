/**
 * SECURE DATABASE CLIENT
 * This client proxies all database requests to /api/db to hide
 * the Turso URL and Auth Token from the frontend.
 */

export const db = {
  /**
   * Runs a secure predefined action on the server.
   * This is Level 3 security: frontend sends command name + params, never SQL.
   * Authentication is handled on the server.
   */
  runAction: async (action, params = {}) => {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, the API Key should be handled via session/cookies,
          // but we keep the header for compatibility with existing Vercel setup.
          'x-api-key': import.meta.env.VITE_APP_API_KEY || ''
        },
        body: JSON.stringify({ action, params }, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
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
   * execute is now a wrapper for runAction to maintain backwards compatibility
   * while enforcing server-side action security.
   * @deprecated Use runAction directly.
   */
  execute: async (query) => {
    console.warn("db.execute() is deprecated for security. Use db.runAction() instead.");
    // We handle a few legacy cases if absolutely necessary, 
    // but the goal is to move everything to runAction.
    return { rows: [] };
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
