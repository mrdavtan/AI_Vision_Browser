import websocket
import threading
import json

# Flag to track when it's appropriate to send the next question
awaiting_response_completion = False

def on_message(ws, message):
    global awaiting_response_completion
    try:
        response = json.loads(message)
        if response['type'] in ['output', 'status']:
            # Handle output and status messages by simply printing them.
            print(response['message'])
        elif response['type'] == 'end_of_response':
            # When the end of the response sequence is indicated, allow sending the next input.
            awaiting_response_completion = False
            print("Server has completed the response. You may ask another question.")
            send_input(ws)
    except Exception as e:
        print(f"Could not parse server response: {e}")

def send_input(ws):
    global awaiting_response_completion
    if not awaiting_response_completion:
        input_text = input("Your next question: ")
        ws.send(json.dumps({'command': 'input', 'data': input_text}))
        awaiting_response_completion = True  # Wait for the end_of_response before sending another question.
    else:
        print("Still waiting for the server to complete the response...")

def on_open(ws):
    print('Connected to WebSocket server. Please type your question.')
    send_input(ws)

def start_websocket():
    ws_app = websocket.WebSocketApp("ws://localhost:8080",
                                    on_message=on_message,
                                    on_open=on_open)
    ws_app.run_forever()

if __name__ == "__main__":
    thread = threading.Thread(target=start_websocket)
    thread.daemon = True
    thread.start()

    try:
        while True: pass
    except KeyboardInterrupt:
        print("\nProgram exited by user")

