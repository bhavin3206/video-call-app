const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const path = require('path');

const peerServer = ExpressPeerServer(server, { debug: true, path: '/peerjs' });

app.use('/peerjs', peerServer);
app.use(express.static('public'));

app.get('/call', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let users = {};

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        if (!username) return;
        users[socket.id] = username;
        socket.broadcast.emit('user-joined', { id: socket.id, username });
        io.to(socket.id).emit('active-users', Object.entries(users).filter(([id]) => id !== socket.id));
    });

    socket.on('call-user', ({ callerId, calleeId, username }) => {
        io.to(calleeId).emit('incoming-call', { callerId, username });
    });

    socket.on('accept-call', ({ callerId, calleeId }) => {
        io.to(callerId).emit('call-accepted', { calleeId });
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        delete users[socket.id];
        io.emit('user-left', { id: socket.id, username });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}/call`);
});