import express from 'express';
import WebSocket, { Server as WebsocketServer } from 'ws';
import { join } from 'path';
import { Loader } from './loader';
import helmet from 'helmet';

const port = process.env.PORT || 3000;

const app = express()
  .use(helmet())
  .use(express.static(join(__dirname, '..', 'static')))
  .listen(port, () => console.log(`Server is listening on port ${port}.`));

const wss = new WebsocketServer({ server: app });

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  const loader = new Loader(ws);
  ws.on('message', (data: WebSocket.Data) => loader.createPDF(data.toString()));
  ws.on('close', () => console.log('Client disconnected'));
});
