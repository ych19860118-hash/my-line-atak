const express = require('express');
const { Pool } = require('pg');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 🌟 核心：開放靜態檔案目錄，這樣前端網頁才能正確讀到你建立的 /tiles/ 資料夾！
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. 初始化 Postgres 連線
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS group_markers (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    label TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => console.error('資料表建立失敗:', err));

const server = app.listen(port, () => console.log(`伺服器正在運行於連接埠 ${port}`));
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.room_id = null;
  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.action === 'join') {
        ws.room_id = parsed.room_id; 
        const res = await pool.query(
          'SELECT * FROM group_markers WHERE room_id = $1 ORDER BY created_at ASC',
          [ws.room_id]
        );
        ws.send(JSON.stringify({ action: 'init', data: res.rows }));
      }
      if (parsed.action === 'add_marker' && ws.room_id) {
        const currentRoom = ws.room_id;
        const { type, lat, lng, label } = parsed.data;
        await pool.query(
          'INSERT INTO group_markers (room_id, type, lat, lng, label) VALUES ($1, $2, $3, $4, $5)',
          [currentRoom, type, lat, lng, label]
        );
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.room_id === currentRoom) {
            client.send(JSON.stringify({ action: 'broadcast_marker', data: parsed.data }));
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
});

