import * as express from "express";
import { Server as WebsocketServer } from 'ws';
import { join, resolve } from "path";

const port = process.env.PORT || 3000;

const app = express()
  .use(express.static(join(__dirname, "static")))
  .post('/load', (req, res) => {
    
  })
  .listen(port, () => console.log(`Server is listening on port ${port}.`));



const wss = new WebsocketServer({ server: app });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 2000);
