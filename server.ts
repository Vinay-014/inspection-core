import path from 'path';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './src/server/app';
import { closePool } from './src/lib/db';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`InspectionCore Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Process] Received ${signal}. Terminating gracefully...`);
    server.close(async () => {
      await closePool();
      console.log('[Process] Server and Database Pool shut down cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Fatal Server Initialization Error:', err);
  process.exit(1);
});
