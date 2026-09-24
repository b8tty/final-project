const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const reportRoutes = require('./routes/reports');
const voterRoutes = require('./routes/voters');
const { init: initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/voters', voterRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`IEBC Polling Station API running on port ${PORT}`);
});
