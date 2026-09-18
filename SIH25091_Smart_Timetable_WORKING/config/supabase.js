const { createClient } = require('@supabase/supabase-js');
let WebSocketTransport;
try {
  WebSocketTransport = require('ws');
} catch {
  // Node 22+ has built-in global WebSocket; ws package provides backwards compatibility
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};

if (WebSocketTransport) {
  clientOptions.realtime = { transport: WebSocketTransport };
}

// Ensure the client is cleanly instantiated only when credentials exist
const supabase = (supabaseUrl && supabaseSecretKey)
  ? createClient(supabaseUrl, supabaseSecretKey, clientOptions)
  : null;

module.exports = supabase;
