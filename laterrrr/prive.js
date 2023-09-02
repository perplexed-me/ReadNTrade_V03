io.on('connection', (socket) => {
    console.log('A user connected');

    // Let's assume clients emit a 'join' event when they want to join a room for a chat
    socket.on('join', (senderID, receiverID) => {
        let roomName = createRoomName(senderID, receiverID);
        socket.join(roomName);
        console.log(`User with ID ${senderID} joined room ${roomName}`);
    });

    socket.on('message', (msg) => {
        let roomName = createRoomName(msg.senderID, msg.receiverID);
        io.to(roomName).emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

function createRoomName(id1, id2) {
    // Ensure room name is always consistent regardless of the order of IDs
    if (id1 < id2) {
        return id1 + '-' + id2;
    } else {
        return id2 + '-' + id1;
    }
}
