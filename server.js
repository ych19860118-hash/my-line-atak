const { Pool } = require('pg');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

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

// 2. 直接啟動純 WebSocket 伺服器
const wss = new WebSocket.Server({ port }, () => {
  console.log(`戰術數據中心正在運行於連接埠 ${port}`);
});

wss.on('connection', (ws) => {
  console.log('有新隊員連線到數據中心');
  ws.room_id = null; 

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      
      // 1. 成員進房間：撈歷史紀錄
      if (parsed.action === 'join') {
        ws.room_id = parsed.room_id; 
        console.log(`成員已加入戰術房間: ${ws.room_id}`);

        const res = await pool.query(
          'SELECT * FROM group_markers WHERE room_id = $1 ORDER BY created_at ASC',
          [ws.room_id]
        );
        ws.send(JSON.stringify({ action: 'init', data: res.rows }));
      }

      // 2. 新增標記：隔離轉發
      if (parsed.action === 'add_marker') {
        const currentRoom = ws.room_id;
        if (!currentRoom) return;

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
