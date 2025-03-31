import { Server } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prisma';

let io: Server | null = null;

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });

      // Handle verification status updates
      socket.on('verificationStatusUpdate', async (data: { userId: string; verified: boolean }) => {
        try {
          const user = await prisma.user.update({
            where: { id: data.userId },
            data: { verified: data.verified },
          });

          // Emit to all connected clients
          io.emit('verificationStatusChanged', {
            userId: user.id,
            verified: user.verified,
          });
        } catch (error) {
          console.error('Error updating verification status:', error);
        }
      });
    });

    res.socket.server.io = io;
    httpServer.listen(3001);
  }

  res.end();
};

export { io };
export default ioHandler; 