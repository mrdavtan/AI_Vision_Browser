import readline from 'readline';
import fs from 'fs';

export async function input(text) {
  // ... (input handling logic)
}

export async function image_to_base64(image_file) {
  // ... (image to base64 conversion logic)
}

export async function sleep(milliseconds) {
  // ... (sleep function logic)
}

export async function highlight_links(page) {
  // ... (highlight links logic)
}

export async function waitForEvent(page, event) {
  // ... (wait for event logic)
}
export async function waitForEventOrTimeout(page, event, timeout) {
  return Promise.race([
    waitForEvent(page, event),
    sleep(timeout)
  ]);
}
