import json
import sys
import os

def flatten_json_to_text(input_file, output_file):
    """
    Flatten a JSON structure from an input file into a text file.

    Parameters:
    - input_file: String, the name of the input file containing JSON data.
    - output_file: String, the name of the output file where the text will be saved.

    This function does not return any value. It writes directly to a file.
    """

    # Load JSON data from the input file
    with open(input_file, 'r') as file:
        data = json.load(file)

    # Check if the output file already exists
    if os.path.exists(output_file):
        # Ask the user for confirmation to overwrite the file
        response = input(f"The file '{output_file}' already exists. Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return

    # Open the output file in write mode
    with open(output_file, 'w') as file:
        for entry in data:
            # Determine the prefix based on the role and format the message
            prefix = 'user: ' if entry['role'] == 'client' else 'server: '
            formatted_message = f"{prefix}{entry['message']}\n"

            # Write the formatted message to the file
            file.write(formatted_message)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input_json_file> <output_text_file>")
        sys.exit(1)

    input_file_name = sys.argv[1]
    output_file_name = sys.argv[2]

    # Call the function with the command line arguments
    flatten_json_to_text(input_file_name, output_file_name)

    print(f"Conversation has been flattened and saved to '{output_file_name}'.")

