import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import ping from 'ping';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for pinging
  app.post('/api/ping', async (req, res) => {
    const { host, count = 10 } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }

    try {
      const results = [];
      let successCount = 0;
      let min = Infinity;
      let max = 0;
      let sum = 0;

      // Perform multiple pings to compute stats
      for (let i = 0; i < count; i++) {
        const result = await (ping.promise.probe(host, {
          timeout: 2,
        }) as Promise<any>);

        if (result.alive) {
          const time = typeof result.time === 'number' ? result.time : parseFloat(result.time);
          results.push(time);
          successCount++;
          if (time < min) min = time;
          if (time > max) max = time;
          sum += time;
        }
      }

      const avg = successCount > 0 ? sum / successCount : 0;
      const packetLoss = ((count - successCount) / count) * 100;

      res.json({
        host,
        avg: parseFloat(avg.toFixed(2)),
        min: successCount > 0 ? parseFloat(min.toFixed(2)) : 0,
        max: parseFloat(max.toFixed(2)),
        packetLoss: parseFloat(packetLoss.toFixed(1)),
        alive: successCount > 0
      });
    } catch (error) {
      console.error('Ping error:', error);
      res.status(500).json({ error: 'Failed to ping host' });
    }
  });

  // API route for RIPE Anchors
  app.get('/api/anchors', async (req, res) => {
    try {
      const pageSize = req.query.page_size || 100;
      const response = await fetch(`https://ui.prod.atlas.ripe.net/api/v2/anchors/?page_size=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch from RIPE');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('RIPE Fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch anchors' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
