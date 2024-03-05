import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';

const messageEmitter = new EventEmitter();
let currentClient = null;

export function startWebSocketServer() {
  const wss = new WebSocketServer({ port: 8080 });

  wss.on('connection', (ws) => {
    console.log(`Client connected`);
    currentClient = ws;
    // ... (WebSocket event handling logic)
  });
}

export function sendMessageToClient(message) {
  if (currentClient) {
    currentClient.send(JSON.stringify(message));
  }
}
