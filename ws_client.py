import websocket
import threading
import json

def on_message(ws, message):
    try:
        response = json.loads(message)
        # Only display the server's output message directly to the user
        if response['type'] == 'output':
            print(response['message'])  # Display meaningful output directly
        elif response['type'] == 'complete':
            # Optionally, prompt the user for the next input here or after a 'status' update
            pass
    except Exception as e:
        print(f"Could not parse server response: {e}")

def send_input(ws):
    input_text = input("Your next question: ")  # Prompt the user for the next question
    ws.send(json.dumps({'command': 'input', 'data': input_text}))

def on_open(ws):
    print('Connected to WebSocket server. Please type your question.')
    send_input(ws)  # Initial prompt for input

def start_websocket():
    ws_app = websocket.WebSocketApp("ws://localhost:8080",
                                    on_message=on_message,
                                    on_open=on_open)
    ws_app.run_forever()

if __name__ == "__main__":
    thread = threading.Thread(target=start_websocket)
    thread.daemon = True  # Allows the program to exit if this thread is the only one left
    thread.start()

    try:
        # Keep the main thread alive; otherwise, the program will exit
        while True:
            # This loop keeps the main thread running
            pass
    except KeyboardInterrupt:
        print("\nProgram exited by user")

