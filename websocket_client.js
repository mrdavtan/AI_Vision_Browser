import readline from 'readline';
import WebSocket from 'ws';  // Ensure WebSocket is imported correctly

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
  // Convert Buffer to string
  const dataStr = data.toString();

  try {
    // Now parse the string as JSON
    const response = JSON.parse(dataStr);
    if (response.type === 'output') {
      console.log(`${response.message}`);
    } else if (response.type === 'complete') {
      console.log(`Status from server: ${response.message}`);
      sendInput(); // Prompt for next input as per your original logic
    } else if (response.type === 'status') {
      console.log(`Status from server: ${response.message}`);
    } else if (response.type === 'error') {
      console.error(`Error from server: ${response.message}`);
    }
  } catch (error) {
    console.error('Error parsing server response:', error);
  }
});

//ws.on('message', (data) => {
//  try {
//    const response = JSON.parse(data);
//    if (response.type === 'output') {
//      console.log(`${response.message}`);
//      // Do not call sendInput() here for 'output' messages
//    } else if (response.type === 'complete') {
//      // Only prompt for next input when 'complete' message is received
//      sendInput();
//    } else if (response.type === 'status') {
//      // Only prompt for next input when 'complete' message is received
//    } else if (response.type === 'error') {
//      console.error(`Error from server: ${response.message}`);
//      // Optionally, you can decide whether to call sendInput() here
//    }
//  } catch (error) {
//    console.error('Error parsing server response:', error);
//  }
//});
//
ws.on('close', () => {
    console.log('Disconnected from WebSocket server.');
    rl.close();
});

function sendInput() {
    rl.question('Client: ', (input) => {
        ws.send(JSON.stringify({ command: 'input', data: input }));
    });
}

