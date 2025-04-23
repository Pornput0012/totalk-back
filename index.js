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
        console.log("กำลังจะส่ง  create ไปที่ client", room);

        let roomNumber = generateUniqueRoomNumber();
        rooms[roomNumber] = {
          question: groupQuestion[0],
          client: new Set(),
          host: client,
        };
        rooms[roomNumber].client.add(client);
        client.room = roomNumber;
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
        console.log("กำลังจะส่ง  join ไปที่ client", room);

        if (rooms[room]) {
          rooms[room].client.add(client);
          client.room = room;

          // Send message to the joining client
          client.send(
            objectToString({
              type: "joined",
              room,
              questionLength: rooms[room].question.length,
            })
          );

          // Notify other clients that someone joined
          for (const c of rooms[room].client) {
            if (c !== client && c.readyState === WebSocket.OPEN) {
              c.send(
                objectToString({
                  type: "userJoined",
                  room,
                })
              );
            }
          }
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;

      case "message":
        console.log("กำลังจะส่ง  message ไปที่ client", room);

        if (rooms[room]) {
          const clientsInRoom = rooms[room].client;
          if (clientsInRoom) {
            for (const c of clientsInRoom) {
              if (c.readyState === WebSocket.OPEN) {
                c.send(
                  objectToString({
                    type: "message",
                    room,
                    msg: rooms[room].question[msg],
                    number: msg,
                  })
                );
              }
            }
          }
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;

      case "delete":
        console.log("กำลังจะส่ง deleted ไปที่ client", room);
        if (rooms[room]) {
          rooms[room].client.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(objectToString({ type: "deleted", room }));
            }
          });
          delete rooms[room];
          console.log(`Room ${room} ถูกลบโดย client`);
        } else {
          client.send(
            objectToString({ type: "error", msg: "ห้องไม่พบเพื่อลบ!" })
          );
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

      // If the host disconnects, delete the room
      if (client === rooms[room].host) {
        rooms[room].client.forEach((c) => {
          if (c !== client && c.readyState === WebSocket.OPEN) {
            c.send(objectToString({ type: "deleted", room }));
          }
        });
        delete rooms[room];
        console.log(`Room ${room} ถูกลบเพราะ host ออก`);
      } else if (rooms[room].client.size === 0) {
        delete rooms[room];
        console.log(`Room ${room} ถูกลบเพราะไม่มีผู้ใช้งาน`);
      }
    }
  });
});

const port = process.env.PORT || 8080
server.listen(port, () => {
  console.log("Server เริ่มที่ http://localhost:8080");
});
