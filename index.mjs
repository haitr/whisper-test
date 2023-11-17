import express from 'express';
import * as fs from 'node:fs';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { FileWriter } from 'wav';
import { whisper } from 'whisper-node';

const app = express();
const server = createServer(app);
const io = new Server(server);
// const io = new Server(server, { path: "/push" });
const cacheDir = './cache'
const cachePath = `${cacheDir}/cache.wav`;
const wavWriter = new FileWriter(cachePath, {
    channels: 2, // Number of audio channels (2 for stereo)
    sampleRate: 16000, // Sample rate (e.g., 44.1 kHz)
    bitDepth: 16, // Bit depth (e.g., 16 bits)
});
var writable = true;

// Middleware to parse JSON in the request body
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<html><h2>Welcome to Socket.io server.</h2></html>');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    // write only limited seconds
    setTimeout(() => {
        writable = false;
        wavWriter.end(async () => {
            console.log('Done writing.');
            console.time('transcript');
            const transcript = await whisper(cachePath);
            console.timeEnd('transcript');
            console.log('------');
            console.log(transcript);
        });
    }, 5000);
    socket.on('data', (msg) => {
        if (writable) {
            wavWriter.write(msg);
        }
    });
});

// Start server
function init() {
    if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
    }
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }
    if (!fs.existsSync(cachePath)) {
        const fileWriter = fs.createWriteStream(cachePath);
        wavWriter.pipe(fileWriter);
    }
}

const port = 3000;
server.listen(port, () => {
    init();
    console.log('Socket listening on *:3000');
});