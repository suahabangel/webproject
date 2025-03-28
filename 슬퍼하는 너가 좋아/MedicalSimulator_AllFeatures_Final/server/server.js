
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./socket');
const simulationRoutes = require('./routes/simulations');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);
initSocket(server);

connectDB();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/simulations', simulationRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
