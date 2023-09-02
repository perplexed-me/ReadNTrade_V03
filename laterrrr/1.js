const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// OracleDB setup
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;  // Return rows as objects
const dbConfig = {
    user: 'YOUR_DB_USER',
    password: 'YOUR_DB_PASSWORD',
    connectString: 'YOUR_CONNECTION_STRING'
};

app.use(bodyParser.json());

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (msg) => {
        io.emit('message', msg);  // broadcast the message to all clients
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.post('/storeMessage', async (req, res) => {
    const { userID, message } = req.body;

    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);

        // Generate a unique messageID using a sequence (assuming a sequence named MESSAGE_SEQ exists)
        const result1 = await connection.execute("SELECT MESSAGE_SEQ.NEXTVAL as id FROM DUAL");
        const messageID = result1.rows[0].ID;

        // Insert into Message table
        await connection.execute("INSERT INTO Message(messageID, text, msz_time) VALUES(:id, :text, SYSTIMESTAMP)", {
            id: messageID,
            text: message
        });

        // Insert into Chat table. Assuming same sender and receiver for simplicity.
        await connection.execute("INSERT INTO Chat(senderID, receiverID, messageID) VALUES(:userID, :userID, :id)", {
            userID: userID,
            id: messageID
        });

        await connection.commit();

        res.json({ success: true });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error rolling back transaction:', rollbackErr);
            }
        }
        console.error(err);
        res.status(500).json({ success: false, message: "Internal Server Error" });

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

server.listen(3000, () => {
    console.log('Server started on port 3000');
});
