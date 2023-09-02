const socket = io()

let textarea = document.querySelector('#textarea')
let messageArea = document.querySelector('.message__area')
let userID;

// Assuming the user logs in and you have access to their userID
userID = getCurrentUserID();  // Implement this function based on your authentication system.

textarea.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
        sendMessage(e.target.value)
    }
})

function sendMessage(message) {
    let msg = {
        userID: userID,
        message: message.trim()
    }
    // Append 
    appendMessage(msg, 'outgoing')
    textarea.value = ''
    scrollToBottom()

    // Send to server 
    socket.emit('message', msg)

    // Store in the database
    fetch('/storeMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(msg)
    }).then(response => response.json())
      .then(data => {
          if (!data.success) {
              console.error('Error saving the message to the database.');
          }
      });
}

function appendMessage(msg, type) {
    let mainDiv = document.createElement('div')
    let className = type
    mainDiv.classList.add(className, 'message')

    let markup = `
        <h4>${msg.userID}</h4>
        <p>${msg.message}</p>
    `
    mainDiv.innerHTML = markup
    messageArea.appendChild(mainDiv)
}

// Receive messages 
socket.on('message', (msg) => {
    appendMessage(msg, 'incoming')
    scrollToBottom()
})

function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight
}
