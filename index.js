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

// 服務器端socket在port 4000運行
io.listen(4000);


// 建立上線的users物件
const joinedUsers = new Map(); 
// 建立離線的users物件
const leftUsers = new Map();


io.on('connection', (socket) => {
  // 印出已連線的加入者的socket id
  console.log('New user connected, ID:', socket.id);

  // 監聽user-joined事件，data為當前用戶資料currentMemberInfo
  socket.on('user-joined', (data) => {
    joinedUsers.set(socket.id, data); // 以socket.id為key，將新用戶data加入joinedUsers
    console.log(`${data.name} joined, ID:`, socket.id);
    io.emit('user-joined', Array.from(joinedUsers.values())); // 將完整的joinedUsers發送給客戶端，取值並從物件改為陣列
  });

  // 監聽create-message事件，msg為當前用戶在公開聊天室input裡輸入的value
  socket.on('create-message', (msg) => {
    const data = joinedUsers.get(socket.id) // 用socket.id來取得sender的data
    const messageData = { message: msg, sender: data }; // 訊息資料包含sender的data
    console.log('Message from user', socket.id, ':', messageData);
    io.emit('create-message', messageData); // 將完整的訊息資料發送給客戶端
  });

  socket.on('private-message', ({ receiverId, value }) => {
    const senderId = joinedUsers.get(socket.id).id
    console.log(senderId)
    const sortedIds = [senderId, receiverId].sort().join('-');
    console.log(sortedIds)
    const roomName = `Room-${sortedIds}`
    socket.join(roomName);
    const data = joinedUsers.get(socket.id)
    const messageData = { message: value, sender: data };
    // 将消息发送到该房间，只有加入到该房间的 socket（即用户B）才能接收到这条消息
    io.to(roomName).emit('private-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected, ID:', socket.id);
    if(joinedUsers.has(socket.id)) {
      const data = joinedUsers.get(socket.id)
      console.log(`${data.name} has disconnected.`);
      joinedUsers.delete(socket.id)// 將離開的用戶從joinedUsers列表刪除
      leftUsers.set(socket.id, data); // 將離開的用戶加入leftUsers列表
    }
    io.emit('user-joined', Array.from(joinedUsers.values())) // 將更新後的用戶發送給客戶端
    io.emit('user-left', Array.from(leftUsers.values())); // 將更新後的用戶發送給客戶端
  });
});


server.listen(3000, () => {
  console.log('listening on *:3000');
});