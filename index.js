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
    // 以socket.id為key，將新用戶data加入joinedUsers
    joinedUsers.set(socket.id, data); 
    console.log(`${data.name} joined, ID:`, socket.id);
    // 將完整的joinedUsers發送給客戶端，取值並從物件改為陣列
    io.emit('user-joined', Array.from(joinedUsers.values())); 
  });

  // 監聽create-message事件，msg為當前用戶在公開聊天室input裡輸入的value
  socket.on('create-message', ({ value, now }) => {
    // 用socket.id來取得sender的data
    const data = joinedUsers.get(socket.id) 
    // 訊息資料包含sender的data
    const messageData = { message: value, sender: data, time: now }; 
    console.log('Message from user', socket.id, ':', messageData);
    // 將完整的訊息資料發送給客戶端
    io.emit('create-message', messageData); 
  });

  socket.on('private-message', ({ userInfo, value, now }) => {
    // 用socket.id取出sender的userId
    const senderId = joinedUsers.get(socket.id).id
    const receiverId = userInfo.id
    // 用sender和receiver的id命名房間名，並且用sort()排序確保兩個用戶之間的房間名一致
    const sortedIds = [senderId, receiverId].sort().join('-');
    // 用socket join連線到房間
    const roomName = `Room-${sortedIds}`
    socket.join(roomName);
    // 訊息資料包含sender的data
    const data = joinedUsers.get(socket.id)
    const messageData = { message: value, sender: data, receiver: userInfo, room: roomName, time: now };
    // 將訊息發送到該房間，只有進入房間的人才能看見訊息
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