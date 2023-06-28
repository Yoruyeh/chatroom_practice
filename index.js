const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
// 在本地執行時，伺服器端運行在port 3000，客戶端運行在3001
const io = new Server({
  cors: {
    origin: "http://localhost:3001"
  }
});

io.listen(4000);
// 服務器端socket在port 4000運行
// import { io } from 'socket.io-client';
// // "undefined" means the URL will be computed from the `window.location` object
// const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
// export const socket = io(URL, {
//   autoConnect: false
// });


const joinedUsers = new Map();
const leftUsers = new Map();
const clients = new Map();

io.on('connection', (socket) => {
  console.log('New user connected, ID:', socket.id);

  socket.on('create-message', (msg) => {
  const data = clients.get(socket.id)
  const messageData = { message: msg, sender: data };
  console.log('Message from user', socket.id, ':', messageData);
  io.emit('create-message', messageData);
  });

   socket.on('user-joined', (data) => {
    clients.set(socket.id, data)
    joinedUsers.set(data.userId, data); // 將新用戶加入joinedUsers列表
    console.log('User joined, ID:', socket.id);
    console.log(`User ${data.userName} has joined.`);
    console.log(Array.from(joinedUsers.values()))
    io.emit('user-joined', Array.from(joinedUsers.values())); // 將完整的用戶發送給客戶端
  });

  socket.on('disconnect', () => {
    console.log('User disconnected, ID:', socket.id);
    if(clients.has(socket.id)) {
      const data = clients.get(socket.id)
      const username = data.userName;
      console.log(`User ${username} has disconnected.`);
      joinedUsers.delete(data.userId)// 將離開的用戶從joinedUsers列表刪除
      leftUsers.set(data.userId, data); // 將離開的用戶加入leftUsers列表
      clients.delete(socket.id);
    }
    io.emit('user-joined', Array.from(joinedUsers.values()))
    io.emit('user-left', Array.from(leftUsers.values())); // 將更新後的用戶發送給客戶端
  });
});


server.listen(3000, () => {
  console.log('listening on *:3000');
});