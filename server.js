const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
io.on('connection', (socket) => {
    socket.on('draw_shape', (data) => { socket.broadcast.emit('receive_shape', data); });
});
server.listen(3000, () => { console.log(`\n🚀 類 ATAK 地圖伺服器已啟動！\n🔗 測試連結：http://localhost:3000`); });
