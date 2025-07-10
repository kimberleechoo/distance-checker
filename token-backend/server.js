// server.js
const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
console.log('✅ Loaded EMAIL:', process.env.ONEMAP_EMAIL);
console.log('✅ Loaded PASSWORD:', process.env.ONEMAP_PASSWORD);

const app = express();
const PORT = 3001 || process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/get-token', async (req, res) => {
try {
   const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD,
   }),
   });

   const data = await response.json();
   res.json(data);
} catch (error) {
   console.error('Token fetch error:', error);
   res.status(500).json({ error: 'Server error' });
}
});

app.listen(PORT, () => {
console.log(`✅ Server running at http://localhost:${PORT}`);
});
