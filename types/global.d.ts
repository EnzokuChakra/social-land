import { Server } from 'socket.io';

declare global {
  var io: Server | null;
}

export {}; 