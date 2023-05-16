const express = require('express');
const app = express();
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create a new WebSocket server
const wss = new WebSocket.Server({ port: 20000 });

const clients = {};
const rooms = {};

// Handle WebSocket connections
wss.on('connection', function connection(ws) {
    // console.log(ws)

    // Log the new client connection
    const clientId = uuidv4(); // generate a unique client ID
    clients[clientId] = ws; // store the WebSocket client in the clients object

    console.log(`WebSocket client connected with ID ${clientId}`);

    // Handle incoming WebSocket messages
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === 'join-room') {
            const { email } = data.payload;
            const roomId = email;

            // validate room id
            if (!roomId) {
                ws.send(JSON.stringify({ type: 'error', message: 'email is required' }));
            }

            if (clients[clientId]) {
                // add client to room
                if (!rooms[roomId]) {
                    rooms[roomId] = [];
                }

                rooms[roomId].push(clientId);

                clients[clientId].send(JSON.stringify({ type: 'join-room', roomId, clientId }));
            }
        }
    });

    ws.on('close', function () {
        delete clients[clientId];
        console.log(`WebSocket client disconnected with ID ${clientId}`);

        // delete from room
        for (const roomId in rooms) {
            const index = rooms[roomId].indexOf(clientId);
            if (index > -1) {
                rooms[roomId].splice(index, 1);
                console.log(`WebSocket client ${clientId} removed from room ${roomId}`);
            }
        }
    });

    // Send a message to the client
    ws.send(JSON.stringify({
        "event": "client-connect",
        "event-data": {
            "client-id": clientId
        }
    }));
});

// app get
app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/event', function (req, res) {
    data = req.body;
    // console.log(req);

    // required body email, event, event-data
    if (data.email && data.event && data["event-data"]) {
        const clientId = data.email;
        const event = data.event;
        const eventData = data["event-data"];

        // send message to client
        if (clients[clientId]) {
            clients[clientId].send(JSON.stringify({ event, eventData }));
            return res.send({
                message: 'success',
                data: {
                    email: clientId,
                    event,
                    eventData
                }
            }), 200;
        }

        // send message all client in room email
        if (rooms[clientId]) {
            rooms[clientId].forEach(clientId => {
                if (clients[clientId]) {
                    clients[clientId].send(JSON.stringify({ event, eventData }));
                }
            });

            console.log(`Send message to room ${clientId}`);
        }

        return res.send('client not found or disconected'), 404;
    }

    return res.send('Email, event, event-data is required'), 400;
});

// Start the Express app
app.listen(20001, function () {
    console.log('Express app listening on port 20001');
});
