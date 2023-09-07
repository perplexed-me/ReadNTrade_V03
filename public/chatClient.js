
const socket = io()
console.log('started..')

//global 
let roomName;
let sender, receiver;
let sender_name, receiver_name;


function clearMessages() {
  const messagesContainer = document.getElementById('messages');
  while (messagesContainer.firstChild) {
    messagesContainer.removeChild(messagesContainer.firstChild);
  }
}


function fetchOldMessages(senderID, receiverID) {
  fetch('/chatList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user1ID: senderID,
      user2ID: receiverID
    })
  })
  .then(response => response.json())
  .then(data => {
    // console.log(data)
    sender_name= data.senderName
    receiver_name = data.receiverName
    data.messages.forEach(message => {
      
      appendMessage(message[1], message[3]);
    });
  })
  .catch(error => {
    console.error('Error fetching old messages:', error);
  });
}


// console.log(sender_name, receiver_name)

// function to join a chat room
function joinRoom(senderID, receiverID) {
  // console.log("client info ", senderID,' -> ', receiverID)
  roomName = createRoomName(senderID, receiverID)
  sender = senderID;
  receiver = receiverID;
  clearMessages();
  socket.emit('join_room', roomName);
  fetchOldMessages(senderID, receiverID);
  const clickedMessageDiv = document.getElementById('clicked-message');
  clickedMessageDiv.textContent = `Chatting with User ${receiverID}`;
}

//
function appendMessage(senderID, messageText) {
  const messageDiv = document.createElement('div');  
  messageDiv.className = 'message-container';  
  // console.log('append ee', sender_name, ' ,',receiver_name)
  // Add sender's name if it's a received message
  if (senderID != sender) {
      const receiverName = document.createElement('div');
      receiverName.className = 'receiver-name';
      receiverName.textContent = receiver_name;
      messageDiv.appendChild(receiverName);  
  }
  else{
      const senderName = document.createElement('div');
      senderName.className = 'sender-name';
      senderName.textContent = sender_name;
      messageDiv.appendChild(senderName);  
  }

  // Create message content div
  const messageContent = document.createElement('div');
  messageContent.textContent = messageText;
  messageContent.className = senderID == sender ? 'send_message' : 'receive_message';
  
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
  // console.log('sendMessage ---+ ', messageData);
  appendMessage(messageData.senderID, messageData.messageText);
  socket.emit('send_message', messageData);
}

//receiving messages

socket.on('receive_message', (data) => {
  // console.log('receive client ee ', data);
  if (data.senderID != sender) {
    appendMessage(data.senderID, data.messageText);
  }

});




function createRoomName(id1, id2) {
  if (id1 < id2) {
    return id1 + '-' + id2;
  } else {
    return id2 + '-' + id1;
  }
}
