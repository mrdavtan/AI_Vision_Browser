import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Continue with your chatlog directory initialization...
const chatlogDir = path.join(__dirname, 'chatlog');
if (!fs.existsSync(chatlogDir)){
    fs.mkdirSync(chatlogDir, { recursive: true });
}

// Initialize history
const history = [];

// Specify the filename for saving the conversation history
const timestamp = new Date().toISOString().replace(/:/g, '-');
const filename = `chatlog/conversation_history_${timestamp}.json`;


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('Connected to WebSocket server.');
    sendInput();
});

ws.on('message', (data) => {
    try {
        const response = JSON.parse(data);
        // Append received message to history
        history.push({ role: 'server', message: response.message });
        updateHistoryToJSON(history, filename); // Save history after updating

        if (response.type === 'output') {
            console.log(`${response.message}`);
        } else if (response.type === 'complete') {
            sendInput();
        }
        // Handle other response types as needed
    } catch (error) {
        console.error('Error parsing server response:', error);
    }
});

function sendInput() {
    rl.question('Client: ', (input) => {
        // Append sent message to history before sending
        history.push({ role: 'client', message: input });
        updateHistoryToJSON(history, filename); // Save history after updating

        ws.send(JSON.stringify({ command: 'input', data: input }));
    });
}

ws.on('close', () => {
    console.log('Disconnected from WebSocket server.');
    rl.close();
});



function updateHistoryToJSON(history, filename) {
    fs.writeFile(filename, JSON.stringify(history, null, 4), 'utf8', (err) => {
        if (err) {
            console.error('Error saving conversation history:', err);
        }
    });
}

