
const socket = io();

let username = prompt("Enter your username:");
while (!username) {
    username = prompt("Username cannot be empty. Please enter your username:");
}
socket.emit('register', username);

// Populate user selection for messaging
socket.on('user list', (users) => {
    const recipientSelect = document.getElementById('recipient-select');
    recipientSelect.innerHTML = '<option value="Everyone">Everyone</option>'; // Reset options
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.innerText = user;
        recipientSelect.appendChild(option);
    });
});

// Handle incoming chat messages
socket.on('chat message', (data) => {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${data.sender}</strong> (${new Date(data.timestamp).toLocaleString()}): ${data.message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the bottom
});

// Handle posted items
socket.on('item posted', (data) => {
    const chatBox = document.getElementById('chat-box');
    const itemElement = document.createElement('div');
    
    itemElement.innerHTML = `<strong>${data.sender}</strong> (${new Date(data.timestamp).toLocaleString()}): ${data.content}`;
    
    if (data.imageUrl) {
        const imageElement = document.createElement('img');
        imageElement.src = data.imageUrl;
        imageElement.style.width = 'medium';
        itemElement.appendChild(imageElement);
    }

    chatBox.appendChild(itemElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the bottom

    // Update counts display
    document.getElementById('sell-count').innerText = `Sell Count: ${data.sellCount}`;
    document.getElementById('rent-count').innerText = `Rent Count: ${data.rentCount}`;
    document.getElementById('donate-count').innerText = `Donate Count: ${data.donateCount}`;
});

// Sending chat messages
const sendButton = document.getElementById('send-button');
sendButton.addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const recipientSelect = document.getElementById('recipient-select');
    const message = messageInput.value;
    const receiver = recipientSelect.value;

    if (message.trim()) {
        socket.emit('send message', { message, receiver });
        messageInput.value = ''; // Clear input
    }
});

// Posting items
const itemForm = document.getElementById('item-form');
itemForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const itemType = document.getElementById('item-type').value;
    const itemDescription = document.getElementById('item-description').value;
    const itemAmount = document.getElementById('item-amount').value;
    const itemImageUrl = document.getElementById('item-image-url').value;

    if ((itemType === 'sell' || itemType === 'rent') && (!itemAmount || !itemImageUrl)) {
        alert('Amount and Image URL are required for selling or renting.');
        return;
    }

    if (itemDescription.trim()) {
        socket.emit('post item', {
            type: itemType,
            item: itemDescription,
            amount: itemAmount.trim() || undefined,
            imageUrl: itemImageUrl.trim() || undefined,
        });
        itemForm.reset(); // Clear form inputs
    }
});
