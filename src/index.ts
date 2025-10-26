import 'reflect-metadata'; // Must be first import for InversifyJS
import { serve } from '@hono/node-server';
import { app } from './routes';
import db from './db';

// Initialize the database
db.initializeDatabase();

const port = 3000;

const server = serve({
  fetch: app.fetch,
  port,
});

server.on('listening', () => {
  console.log(`Server is running on port ${port}`);
});
