const express = require('express');
const { Pool } = require('pg');
const WebSocket = require('ws');
const path = require('path');

const app = report || express();
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

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      
      // 1. 成員進房間：撈歷史紀錄
      if (parsed.action === 'join') {
        const targetRoom = parsed.room_id;
        ws.room_id = targetRoom; // 將房號綁定在當前連線上
        console.log(`成員已加入戰術房間: ${targetRoom}`);

        const res = await pool.query(
          'SELECT * FROM group_markers WHERE room_id = $1 ORDER BY created_at ASC',
          [targetRoom]
        );
        ws.send(JSON.stringify({ action: 'init', data: res.rows }));
      }

      // 2. 新增標記：【物理隔離點】直接讀取前端這包資料帶進來的 room_id
      if (parsed.action === 'add_marker') {
        const { type, lat, lng, label } = parsed.data;
        const currentRoom = ws.room_id;
        
        if (!currentRoom) return;

        // 存入資料庫
        await pool.query(
          'INSERT INTO group_markers (room_id, type, lat, lng, label) VALUES ($1, $2, $3, $4, $5)',
          [currentRoom, type, lat, lng, label]
        );
        
        // 【嚴格廣播】比對每個連線的 room_id，只有在同一個房間內的人才會收到即時廣播
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
