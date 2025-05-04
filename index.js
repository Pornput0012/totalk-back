// Backend (server.js)
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  b2sclubdeeptalk10,
  bestfriend22,
  deeptalk36,
  deeptalkfan50,
} from "./groupQuestion.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const groupQuestion = [
  deeptalk36,
  bestfriend22,
  deeptalkfan50,
  b2sclubdeeptalk10,
];

const rooms = {};

const stringToObject = (str) => JSON.parse(str);
const objectToString = (obj) => JSON.stringify(obj);
const generateRoomNumber = () => Math.floor(100000 + Math.random() * 900000);

function generateUniqueRoomNumber() {
  let roomNumber;
  do {
    roomNumber = generateRoomNumber();
  } while (rooms[roomNumber]);
  return roomNumber;
}

wss.on("connection", (client) => {
  console.log("Client Con nected!");

  client.on("message", (message) => {
    const { type, room, msg, questionIndex } = stringToObject(
      message.toString()
    );

    switch (type) {
      case "create": {
        const roomNumber = generateUniqueRoomNumber();
        rooms[roomNumber] = {
          question: groupQuestion[questionIndex],
          client: new Set(),
          host: client,
          questionIndex: 0,
          currentMessage: "",
        };

        rooms[roomNumber].client.add(client);
        client.room = roomNumber;
        client.isHost = true;

        client.send(
          objectToString({
            type: "created",
            room: roomNumber,
            msg: "Create Room Successful!",
            questionLength: rooms[roomNumber].question.length,
          })
        );
        break;
      }
      case "join": {
        if (rooms[room]) {
          rooms[room].client.add(client);
          client.room = room;
          client.isHost = false;

          client.send(
            objectToString({
              type: "joined",
              room,
              questionLength: rooms[room].question.length,
            })
          );

          for (const c of rooms[room].client) {
            if (c !== client && c.readyState === WebSocket.OPEN) {
              c.send(objectToString({ type: "userJoined", room }));
            }
          }
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;
      }
      case "message": {
        if (rooms[room]) {
          rooms[room].questionIndex = msg;
          rooms[room].currentMessage = rooms[room].question[msg];

          for (const c of rooms[room].client) {
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
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;
      }
      case "delete": {
        if (rooms[room]) {
          for (const c of rooms[room].client) {
            if (c.readyState === WebSocket.OPEN) {
              c.send(objectToString({ type: "deleted", room }));
            }
          }
          delete rooms[room];
          console.log(`Room ${room} ถูกลบโดย client`);
        } else {
          client.send(
            objectToString({ type: "error", msg: "ห้องไม่พบเพื่อลบ!" })
          );
        }
        break;
      }
      case "success": {
        console.log("success");

        if (rooms[room]) {
          for (const c of rooms[room].client) {
            if (c.readyState === WebSocket.OPEN) {
              c.send(objectToString({ type: "success", room }));
            }
          }
          delete rooms[room];
        }
        break;
      }
      case "reconnect": {
        if (rooms[room]) {
          rooms[room].client.add(client);
          client.room = room;
          client.isHost = false;

          client.send(
            objectToString({
              type: "reconnected",
              room,
              questionLength: rooms[room].question.length,
              currentMessage: rooms[room].currentMessage,
              questionIndex: rooms[room].questionIndex,
            })
          );
        } else {
          client.send(objectToString({ type: "error", msg: "ห้องไม่พบ!" }));
        }
        break;
      }
    }
  });

  client.on("close", () => {
    console.log("Client Disconnected!");
    const room = client.room;

    if (room && rooms[room]) {
      rooms[room].client.delete(client);

      for (const c of rooms[room].client) {
        if (c.readyState === WebSocket.OPEN) {
          c.send(objectToString({ type: "disconnect", room }));
        }
      }

      if (client === rooms[room].host) {
        for (const c of rooms[room].client) {
          if (c.readyState === WebSocket.OPEN) {
            c.send(objectToString({ type: "deleted", room }));
          }
        }
        console.log(`Host ของห้อง ${room} ออกจากระบบ`);
        rooms[room].host = null;
        console.log(`Room ${room} ถูกลบเพราะ host ออก`);
      } else if (rooms[room].client.size === 0) {
        delete rooms[room];
        console.log(`Room ${room} ถูกลบเพราะไม่มีผู้ใช้งาน`);
      }
    }
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server เริ่มที่ http://localhost:${port}`);
});
