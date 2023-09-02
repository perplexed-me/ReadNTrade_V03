// export default Chat2;

import { Box, Button, Paper, TextField } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

function Chat2({ socket, room, previousMessage, receiverID }) {

  
  const { currentUser } = useAuth();
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  const chatBodyRef = useRef(null); // Create a ref for the chat body

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room: room,
        senderID: currentUser[0].userID,
        receiverID: receiverID,
        messageText: currentMessage,
        messageTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      await socket.emit("send_message", messageData);
      setMessageList([...messageList, messageData]);
      setCurrentMessage("");
    }
  };

  useEffect(() => {
    if (Array.isArray(previousMessage) && previousMessage.length > 0) {
      setMessageList([...previousMessage]);
    }
  }, [previousMessage]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    if (chatBodyRef.current) {  // Use the ref here
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }

    return () => {
      socket.off("receive_message");
    };
  }, [socket]);

  return (
    <Paper elevation={3} className="chat-window">
      <div className="chat-header">
        <p>Live Chat</p>
      </div>
      <div className="chat-body" ref={chatBodyRef} style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {messageList.map((messageContent, index) => (
          <div
            key={index}
            className="message"
            style={{
              textAlign:
                currentUser[0].userID === messageContent.senderID ? "right" : "left",
            }}
          >
            <Box
              sx={{
                padding: "10px",
                backgroundColor:
                  currentUser[0].userID === messageContent.senderID
                    ? "#e0f7fa"
                    : "#e0e0e0",
                borderRadius: "10px",
                display: "inline-block",
              }}
            >
              <div className="message-content">
                <p>{messageContent.messageText}</p>
              </div>
              <div className="message-meta">
                <p id="time">{messageContent.messageTime}</p>
                <p id="author">{messageContent.senderID}</p>
              </div>
            </Box>
          </div>
        ))}
      </div>
      <div className="chat-footer">
        <TextField
          type="text"
          value={currentMessage}
          placeholder="Hey..."
          onChange={(event) => {
            setCurrentMessage(event.target.value);
          }}
          onKeyPress={(event) => {
            event.key === "Enter" && sendMessage();
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={sendMessage}
          endIcon={<span>&#9658;</span>}
        >
          Send
        </Button>
      </div>
    </Paper>
  );
}

export default Chat2;
