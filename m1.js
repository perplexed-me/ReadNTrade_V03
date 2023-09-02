
// export default Chat;

import axios from "axios";
import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import Chat2 from "./chat2";
import { useAuth } from "../context/AuthContext";
import chatIDGenerator from "../utils/chatIDGenerator";

const socket = io.connect("http://localhost:8000");


function Chat() {

  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [previousMessage, setPreviousMessage] = useState([]);

  const { currentUser } = useAuth();


  useEffect(() => {
    async function fetchInitialData() {
      const response = await axios.post("http://localhost:8000/interactions", {
        userID: currentUser[0].userID,
      });
      
      const firstUser = response.data[0].interactionID;
      console.log(response);
      setInteractions(response.data);

      setSelectedUser(firstUser);
      console.log(selectedUser);
      console.log("user Data", currentUser);
      const generatedRoom = chatIDGenerator(currentUser[0].userID, firstUser);
      setRoom((prevRoom) => {
        socket.emit("join_room", generatedRoom);
        return generatedRoom;
      });
    }

    fetchInitialData();
  }, [currentUser]);



  useEffect(() => {
    console.log("Selected user changed to:", selectedUser);
    // rest of the code...
    async function fetchMessages() {
      const response = await axios.post("http://localhost:8000/messageList", {
        user1ID: currentUser[0].userID,
        user2ID: selectedUser,
      });


      setPreviousMessage(response.data);
      console.log(previousMessage);
      const generatedRoom = chatIDGenerator(
        currentUser[0].userID,
        selectedUser
      );


      setRoom((prevRoom) => {
        socket.emit("join_room", generatedRoom);
        return generatedRoom;
      });

    }

    if (currentUser && currentUser.length > 0) {
      fetchMessages();
    }
  }, [selectedUser, currentUser]);



  const handleInteractionSelect = (interactionID) => {
    console.log("Selected interaction:", interactionID);
    setSelectedUser(interactionID);
    // console.log(previousMessage)
  };

  return (
    <div className="App">
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={{ width: '30%', verticalAlign: 'top', borderRight: '1px solid #ccc' }}>
          <div className="interactions-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {interactions &&
                interactions.map((interaction, index) => (
                  <button
                    key={index}
                    className="interaction-item"
                    onClick={() => handleInteractionSelect(interaction.interactionID)}
                  >
                    Interaction with: {interaction.interactionID}
                  </button>
                ))}
            </div>
          </td>
          <td style={{ width: '70%', paddingLeft: '20px' }}>
            <div>
              <Chat2 socket={socket} room={room} previousMessage={previousMessage} receiverID={selectedUser}/>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
  );
}

export default Chat;
