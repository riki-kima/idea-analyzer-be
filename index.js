const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
  const { data } = await axios.get(req.body.imageUrl, {
    responseType: 'arraybuffer',
  });

  const base64 = Buffer.from(data, 'binary').toString('base64');
  return res.json({ base64 });
});

app.listen(5500, (err) => {
  if (err) console.log('Error in server setup');
  console.log('Server listening on Port ', 5500);
});

module.exports = app;
