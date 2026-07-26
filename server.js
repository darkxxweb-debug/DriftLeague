require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const registerGameSockets = require('./sockets/gameSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.render('lobby'));
app.get('/leaderboard', (req, res) => res.render('leaderboard'));
app.get('/room/:code', (req, res) => res.render('room', { code: req.params.code.toUpperCase() }));
app.get('/race/:code', (req, res) => res.render('race', { code: req.params.code.toUpperCase() }));

app.use('/', apiRoutes);

app.use((req, res) => res.status(404).render('404'));

registerGameSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`DriftLeague running on port ${PORT}`));
