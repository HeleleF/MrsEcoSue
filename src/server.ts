import express from 'express';
import { Server as WebsocketServer } from 'ws';
import { join } from 'path';
import { Loader } from './loader';

const port = process.env.PORT || 3000;

const app = express()
  .use(express.static(join(__dirname, '..', 'static')))
  .listen(port, () => console.log(`Server is listening on port ${port}.`));

const wss = new WebsocketServer({ server: app });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const loader = new Loader(ws);
  ws.on('message', (data) => loader.start(data.toString()));
  ws.on('close', () => console.log('Client disconnected'));
});
