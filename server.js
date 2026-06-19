const express = require('express');
const { Pool } = require('pg');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 直接提供根目錄下的 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. 初始化 Postgres 連線
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 自動建立戰術標記資料表
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

// 2. 初始化 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('有新成員連線');
  let currentRoom = null;

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.action === 'join') {
        currentRoom = parsed.room_id;
        ws.room_id = currentRoom;
        console.log(`成員已加入戰術房間: ${currentRoom}`);

        const res = await pool.query(
          'SELECT * FROM group_markers WHERE room_id = $1 ORDER BY created_at ASC',
          [currentRoom]
        );
        ws.send(JSON.stringify({ action: 'init', data: res.rows }));
      }

      if (parsed.action === 'add_marker' && currentRoom) {
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
      console.error('處理訊息發生錯誤:', err);
    }
  });
});
