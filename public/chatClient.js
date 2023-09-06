const socket = io()
console.log('started..')

//global 
let roomName;
let sender, receiver;

// function to join a chat room
function joinRoom(senderID, receiverID) {
  // console.log("client info ", senderID,' -> ', receiverID)
  roomName = createRoomName(senderID, receiverID)
  sender = senderID;
  receiver = receiverID;

  socket.emit('join_room', roomName);
  const clickedMessageDiv = document.getElementById('clicked-message');
  clickedMessageDiv.textContent = `Chatting with User ${receiverID}`;
}

//
function appendMessage(senderID, messageText) {
  const messageDiv = document.createElement('div');  
  messageDiv.className = 'message-container';  
  
  // Add sender's name if it's a received message
  if (senderID !== '<%= userID %>') {
      const senderName = document.createElement('div');
      senderName.className = 'sender-name';
      senderName.textContent = 'user: '+senderID;
      messageDiv.appendChild(senderName);  
  }

  // Create message content div
  const messageContent = document.createElement('div');
  messageContent.textContent = messageText;
  messageContent.className = senderID === '<%= userID %>' ? 'send_message' : 'receive_message';
  
  messageDiv.appendChild(messageContent);  

  const messagesContainer = document.getElementById('messages');  
  messagesContainer.appendChild(messageDiv); 

  // Scroll to the bottom to ensure the latest message is visible
  messagesContainer.scrollTop = messagesContainer.scrollHeight;  
}






// Function to send a message
function sendMessage(messageText) {
  const messageData = {
    roomName: roomName,
    senderID: sender,
    receiverID: receiver,
    messageText: messageText,

  };
  console.log('sendMessage ---+ ', messageData);
  appendMessage(messageData.senderID, messageData.messageText);
  socket.emit('send_message', messageData);
}

//receiving messages

socket.on('receive_message', (data) => {
  console.log('receive client ee ', data);
  if (data.senderID !== '<%= userID %>') {
    appendMessage(data.senderID, data.messageText);
  }

});




function createRoomName(id1, id2) {
  // Ensure room name is always consistent regardless of the order of IDs
  if (id1 < id2) {
    return id1 + '-' + id2;
  } else {
    return id2 + '-' + id1;
  }
}
