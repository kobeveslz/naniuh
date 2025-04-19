import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection string from environment variable
const pool = new Pool({
  connectionString: process.env.DB_URL,  // This reads the DB connection URL from the environment
});

app.post('/share', async (req, res) => {
  const { fbToken, message = "Shared from API!", shares = 1 } = req.body;

  if (!fbToken || !shares || shares < 1) {
    return res.status(400).json({ message: 'Missing Facebook token or invalid share count' });
  }

  try {
    const results = [];

    // Loop for performing the number of shares requested
    for (let i = 0; i < shares; i++) {
      const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: fbToken,
        }),
      });

      const fbData = await fbRes.json();
      results.push(fbData);

      // Log successful Facebook share in the PostgreSQL database
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

// Root endpoint
app.get('/', (req, res) => {
  res.send('Facebook Share API is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
