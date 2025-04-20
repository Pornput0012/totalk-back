import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { deeptalk } from "./groupQuestion.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const groupQuestion = [deeptalk];

const rooms = {};

const stringToObject = (str) => {
  return JSON.parse(str);
};

const objectToString = (obj) => {
  return JSON.stringify(obj);
};

const generateRoomNumber = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

function generateUniqueRoomNumber() {
  let roomNumber;

  do {
    roomNumber = generateRoomNumber();
  } while (rooms[roomNumber]);

  return roomNumber;
}

wss.on("connection", (client) => {
  console.log("Client Connect!");

  client.on("message", (message) => {
    const { type, room, msg } = stringToObject(message.toString());

    switch (type) {
      case "create":
        let roomNumber = generateUniqueRoomNumber();
        rooms[roomNumber] = {
          question: groupQuestion[0],
          client: new Set(),
        };
        rooms[roomNumber].client.add(client);

        client.send(
          objectToString({
            type: "created",
            room: roomNumber,
            msg: "Create Room Successful!",
            questionLength: rooms[roomNumber].question.length,
          })
        );

        break;
      case "join":
        if (rooms[room]) {
          rooms[room].client.add(client);
          client.room = room;
          client.send(
            objectToString({
              type: "joined",
              room,
              questionLength: rooms[room].question.length,
            })
          );
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;

      case "message":
        const clientsInRoom = rooms[room].client;
        if (clientsInRoom) {
          for (const c of clientsInRoom) {
            if (c.readyState === WebSocket.OPEN) {
              c.send(
                objectToString({
                  type: "message",
                  room,
                  msg: rooms[room].question[msg],
                  number: msg
                })
              );
            }
          }
        }
        break;
      default:
        break;
    }
  });

  client.on("close", () => {
    console.log("Client Disconnect!");
    const room = client.room;
    if (room && rooms[room]) {
      rooms[room].client.delete(client);
    }
  });
});

server.listen(8080, () => {
  console.log("Server เริ่มที่ http://localhost:8080");
});
