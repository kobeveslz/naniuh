import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection string from environment variable
const DB_URL = process.env.DB_URL;
const pool = new Pool({ connectionString: DB_URL });

app.post('/share', async (req, res) => {
  const { fbToken, message = "Shared from API!", shares = 1 } = req.body;

  if (!fbToken || !shares || shares < 1) {
    return res.status(400).json({ message: 'Missing Facebook token or invalid share count' });
  }

  try {
    const results = [];

    for (let i = 0; i < shares; i++) {
      const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: fbToken
        })
      });

      const fbData = await fbRes.json();
      results.push(fbData);

      // Optional DB logging
      if (fbData.id) {
        await pool.query(
          'INSERT INTO shares (token, fb_post_id) VALUES ($1, $2)',
          [fbToken, fbData.id]
        );
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Failed to share', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Facebook Share API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
