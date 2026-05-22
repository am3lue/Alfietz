import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local (from Vercel) and .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use environment variables (Secrets in Vercel)
  const url = process.env.TURSO_URL || process.env.VITE_TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Database configuration missing on server');
    return res.status(500).json({ 
      error: 'Database configuration missing on server',
    });
  }

  // 1. Security Check: API Key Verification
  const apiKey = req.headers['x-api-key'];
  const serverSecret = process.env.APP_API_KEY || process.env.VITE_APP_API_KEY;

  if (!apiKey || apiKey !== serverSecret) {
    console.error('Unauthorized Access Attempt: Invalid or missing API Key');
    return res.status(401).json({ error: 'Unauthorized: Access Denied' });
  }

  const { sql, args, action, params } = req.body;

  try {
    const client = createClient({
      url: url,
      authToken: authToken,
    });

    // 2. Action Hub (Level 2 Security)
    // If an 'action' is provided, we use server-defined SQL instead of client-provided SQL.
    let targetSql = sql;
    let targetArgs = args || [];

    if (action) {
      switch (action) {
        case 'login':
          targetSql = 'SELECT * FROM users WHERE email = ?';
          targetArgs = [params.email];
          break;
        case 'signup':
          targetSql = 'INSERT INTO users (id, username, first_name, last_name, email, password, whatsapp, avatar, user_type, needs, gives, theme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          targetArgs = [params.id, params.username, params.firstName, params.lastName, params.email, params.password, params.whatsapp, params.avatar, params.userType, params.needs, params.gives, 'light'];
          break;
        case 'update_profile':
          targetSql = 'UPDATE users SET username = ?, first_name = ?, last_name = ?, whatsapp = ?, avatar = ?, user_type = ?, needs = ?, gives = ? WHERE id = ?';
          targetArgs = [params.username, params.firstName, params.lastName, params.whatsapp, params.avatar, params.userType, params.needs, params.gives, params.id];
          break;
        case 'delete_product':
          // Double security: only delete if owner matches (Level 2 logic)
          // Also clean up associated data to maintain integrity
          await client.execute({ sql: 'DELETE FROM favorites WHERE product_id = ?', args: [params.productId] });
          await client.execute({ sql: 'DELETE FROM reviews WHERE product_id = ?', args: [params.productId] });
          targetSql = 'DELETE FROM products WHERE id = ? AND owner_id = ?';
          targetArgs = [params.productId, params.userId];
          break;
        case 'write_review':
          targetSql = 'INSERT INTO reviews (product_id, user_id, rating, text) VALUES (?, ?, ?, ?)';
          targetArgs = [params.productId, params.userId, params.rating, params.text];
          break;
        case 'submit_app_review':
          targetSql = 'INSERT INTO app_reviews (user_id, rating, text, image) VALUES (?, ?, ?, ?)';
          targetArgs = [params.userId, params.rating, params.text, params.image];
          break;
        case 'create_order':

          targetSql = 'INSERT INTO orders (id, item_name, customer_id, tailor_id, price, status, size, color, notes, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          targetArgs = [params.id, params.itemName, params.customerId, params.tailorId, params.price, 'Pending', params.size, params.color, params.notes, params.image];
          break;
        case 'create_product':
          targetSql = 'INSERT INTO products (name, price, description, material, image, category_id, owner_id, status, variants_json, gallery_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          targetArgs = [params.name, params.price, params.description, params.material, params.image, params.category_id, params.owner_id, params.status, params.variants_json, params.gallery_json];
          break;
        case 'update_product':
          targetSql = 'UPDATE products SET name = ?, price = ?, description = ?, material = ?, image = ?, category_id = ?, status = ?, variants_json = ?, gallery_json = ? WHERE id = ? AND owner_id = ?';
          targetArgs = [params.name, params.price, params.description, params.material, params.image, params.category_id, params.status, params.variants_json, params.gallery_json, params.id, params.owner_id];
          break;
        case 'update_role':
          targetSql = 'UPDATE users SET user_type = ? WHERE id = ?';
          targetArgs = [params.role, params.id];
          break;
        case 'update_order_status':
          targetSql = 'UPDATE orders SET status = ? WHERE id = ?';
          targetArgs = [params.status, params.orderId];
          break;
        case 'toggle_stock':
          targetSql = 'UPDATE products SET status = ? WHERE id = ?';
          targetArgs = [params.status, params.productId];
          break;
        case 'update_negotiation_status':
          targetSql = 'UPDATE negotiations SET status = ? WHERE id = ?';
          targetArgs = [params.status, params.negotiationId];
          break;
        case 'create_notification':
          targetSql = 'INSERT INTO notifications (user_id, message, is_unread) VALUES (?, ?, 1)';
          targetArgs = [params.userId, params.message];
          break;
        case 'send_message':
          targetSql = 'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)';
          targetArgs = [params.senderId, params.receiverId, params.content];
          break;
        case 'mark_messages_read':
          targetSql = 'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?';
          targetArgs = [params.senderId, params.receiverId];
          break;
        case 'toggle_favorite':
          if (params.isAdding) {
            targetSql = 'INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)';
          } else {
            targetSql = 'DELETE FROM favorites WHERE user_id = ? AND product_id = ?';
          }
          targetArgs = [params.userId, params.productId];
          break;
        case 'increment_likes':
          targetSql = 'UPDATE products SET likes_count = likes_count + 1 WHERE id = ?';
          targetArgs = [params.productId];
          break;
        case 'decrement_likes':
          targetSql = 'UPDATE products SET likes_count = MAX(0, likes_count - 1) WHERE id = ?';
          targetArgs = [params.productId];
          break;
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } else {
      // If no action, it's raw SQL. RESTRICT TO SELECT ONLY for Level 2 security.
      if (targetSql && !targetSql.trim().toUpperCase().startsWith('SELECT')) {
        console.error('Security Violation: Unauthorized data modification attempted via raw SQL');
        return res.status(403).json({ error: 'Forbidden: Data modification requires a Secure Action.' });
      }
    }

    if (!targetSql) {
      return res.status(400).json({ error: 'SQL query or valid action is required' });
    }

    const result = await client.execute({ sql: targetSql, args: targetArgs });

    // Explicitly convert Rows to plain objects for consistent JSON serialization
    const rows = result.rows.map(row => {
      const obj = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return res.status(200).json(JSON.parse(JSON.stringify({ ...result, rows }, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )));
  } catch (error) {
    console.error('Database Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
