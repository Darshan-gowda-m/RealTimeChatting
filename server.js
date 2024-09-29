
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// Connect to MongoDB
mongoose.connect('mongodb://localhost/chat_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define a schema for messages
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    content: String,
    imageUrl: String,
    timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

let users = {};
let sellCount = 0;  // Counter for sells
let rentCount = 0;  // Counter for rents
let donateCount = 0; // Counter for donations

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Register user
    socket.on('register', (username) => {
        socket.username = username;
        users[username] = socket.id; // Map username to socket ID
        io.emit('user list', Object.keys(users)); 
    });

    // Handle sending chat messages
    socket.on('send message', (data) => {
        const { message, receiver } = data;
        const timestamp = new Date();

        const newMessage = new Message({
            sender: socket.username,
            receiver: receiver,
            content: message,
            timestamp: timestamp,
        });

        newMessage.save().then(() => {
            // Emit message only to the intended recipient or to everyone
            if (receiver === 'Everyone') {
                io.emit('chat message', {
                    sender: socket.username,
                    message,
                    receiver,
                    timestamp: timestamp.toISOString(),
                });
            } else {
                // Send to the specific user if they're connected
                const recipientSocketId = users[receiver];
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('chat message', {
                        sender: socket.username,
                        message,
                        receiver,
                        timestamp: timestamp.toISOString(),
                    });
                }
            }
        }).catch(err => {
            console.error('Error saving message:', err);
        });
    });

    // Handle posting items for sell, rent, or donate
    socket.on('post item', (data) => {
        const { type, item, amount, imageUrl } = data;
        const timestamp = new Date();

        // Validate input
        if ((type === 'sell' || type === 'rent') && (!amount || !imageUrl)) {
            socket.emit('error', 'Amount and Image URL are required for selling or renting.');
            return;
        }

        const newMessage = new Message({
            sender: socket.username,
            content: `${type.charAt(0).toUpperCase() + type.slice(1)} posted: ${item} ${amount ? `for $${amount}` : ''}`,
            imageUrl: (type === 'sell' || type === 'rent') ? imageUrl : undefined,
            timestamp: timestamp,
        });

        newMessage.save().then(() => {
            if (type === 'sell') {
                sellCount++;
            } else if (type === 'rent') {
                rentCount++;
            } else if (type === 'donate') {
                donateCount++;
            }

            io.emit('item posted', {
                sender: socket.username,
                content: `${type.charAt(0).toUpperCase() + type.slice(1)} posted: ${item} ${amount ? `for $${amount}` : ''}`,
                imageUrl: newMessage.imageUrl,
                timestamp: timestamp.toISOString(),
                sellCount,
                rentCount,
                donateCount,
            });
        }).catch(err => {
            console.error('Error saving item post:', err);
        });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        delete users[socket.username]; // Remove user from active users
        io.emit('user list', Object.keys(users)); // Update user list for everyone
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
