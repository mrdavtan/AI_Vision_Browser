import dotenv from 'dotenv';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import OpenAI from 'openai';
import readline from 'readline';
import fs from 'fs';
import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';

const timeout = 8000;

dotenv.config({ path: './.env' });
puppeteer.use(StealthPlugin());

const openai = new OpenAI();
const messageEmitter = new EventEmitter();

// Create a WebSocket server
const wss = new WebSocketServer({ port: 8080 });

let currentClient = null; // Keep track of the current WebSocket client

wss.on('connection', (ws) => {
  console.log(`Client connected`);
  currentClient = ws;

  ws.on('message', (msg) => {
    console.log(`WebSocket Message Received: ${msg}`);
    try {
      const messageData = JSON.parse(msg);
      if (messageData.command === 'input') {
        // Emit the data field of the message
        messageEmitter.emit('newMessage', messageData.data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentClient === ws) {
      currentClient = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket Error:', error);
  });
});

async function input(text) {
  let resolvePrompt;

  const promiseCLIInput = () => new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(text, (prompt) => {
      rl.close();
      resolve(prompt);
    });
  });

  const promiseWebSocketInput = () => new Promise((resolve) => {
    resolvePrompt = resolve;
    messageEmitter.on('newMessage', (data) => {
      resolve(data);
    });
  });

  while (true) {
    let thePrompt = await Promise.race([promiseCLIInput(), promiseWebSocketInput()]);

    if (thePrompt) {
      // Send the response to the client
      if (currentClient) {
        currentClient.send(JSON.stringify({ type: 'output', message: thePrompt }));
      }


      // Remove WebSocket listener to prevent it from firing multiple times
      messageEmitter.off('newMessage', resolvePrompt);
      return thePrompt;
    }
  }
}

async function main() {
  while (true) {
    try {
      const prompt = await input('Enter input: ');
      console.log(`Received input: ${prompt}`);
      // Process the input...
    } catch (error) {
      console.error('Error in main loop:', error);
    }
  }
}


async function image_to_base64(image_file) {
    return await new Promise((resolve, reject) => {
        fs.readFile(image_file, (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject();
                return;
            }

            const base64Data = data.toString('base64');
            const dataURI = `data:image/jpeg;base64,${base64Data}`;
            resolve(dataURI);
        });
    });
}


async function sleep( milliseconds ) {
    return await new Promise((r, _) => {
        setTimeout( () => {
            r();
        }, milliseconds );
    });
}

async function highlight_links( page ) {
    await page.evaluate(() => {
        document.querySelectorAll('[gpt-link-text]').forEach(e => {
            e.removeAttribute("gpt-link-text");
        });
    });

    const elements = await page.$$(
        "a, button, input, textarea, [role=button], [role=treeitem]"
    );

    elements.forEach( async e => {
        await page.evaluate(e => {
            function isElementVisible(el) {
                if (!el) return false; // Element does not exist

                function isStyleVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.width !== '0' &&
                           style.height !== '0' &&
                           style.opacity !== '0' &&
                           style.display !== 'none' &&
                           style.visibility !== 'hidden';
                }

                function isElementInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                }

                // Check if the element is visible style-wise
                if (!isStyleVisible(el)) {
                    return false;
                }

                // Traverse up the DOM and check if any ancestor element is hidden
                let parent = el;
                while (parent) {
                    if (!isStyleVisible(parent)) {
                    return false;
                    }
                    parent = parent.parentElement;
                }

                // Finally, check if the element is within the viewport
                return isElementInViewport(el);
            }

            e.style.border = "1px solid red";

            const position = e.getBoundingClientRect();

            if( position.width > 5 && position.height > 5 && isElementVisible(e) ) {
                const link_text = e.textContent.replace(/[^a-zA-Z0-9 ]/g, '');
                e.setAttribute( "gpt-link-text", link_text );
            }
        }, e);
    } );
}

async function waitForEvent(page, event) {
    return page.evaluate(event => {
        return new Promise((r, _) => {
            document.addEventListener(event, function(e) {
                r();
            });
        });
    }, event)
}

(async () => {
    console.log( "###########################################" );
    console.log( "# GPT4V-Browsing by Unconventional Coding #" );
    console.log( "###########################################\n" );

    const browser = await puppeteer.launch( {
        headless: "new",
    } );

    const page = await browser.newPage();

    await page.setViewport( {
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1.75,
    } );

    const messages = [
        {
            "role": "system",
            "content": `You are a website crawler. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.

You can go to a specific URL by answering with the following JSON format:
{"url": "url goes here"}

You can click links on the website by referencing the text inside of the link/button, by answering in the following JSON format:
{"click": "Text in link"}

Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.

In the beginning, go to a direct URL that you think might contain the answer to the user's question. Prefer to go directly to sub-urls like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one.`,
        }
    ];

    console.log("GPT: How can I assist you today?")
    const prompt = await input("You: ");
    //console.log();

    messages.push({
        "role": "user",
        "content": prompt,
    });

    let url;
    let screenshot_taken = false;

    while( true ) {
        if( url ) {
            const crawlingMessage = "Crawling " + url;
            console.log("Crawling " + url);
            if (currentClient)  {
                currentClient.send(JSON.stringify({ type: 'status', message: crawlingMessage }));
}
            await page.goto( url, {
                waitUntil: "domcontentloaded",
            } );

            await highlight_links( page );

            await Promise.race( [
                waitForEvent(page, 'load'),
                sleep(timeout)
            ] );

            await highlight_links( page );

            await page.screenshot( {
                path: "screenshot.jpg",
                quality: 100,
            } );

            screenshot_taken = true;
            url = null;
        }

        if( screenshot_taken ) {
            const base64_image = await image_to_base64("screenshot.jpg");

            messages.push({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": base64_image,
                    },
                    {
                        "type": "text",
                        "text": "Here's the screenshot of the website you are on right now. You can click on links with {\"click\": \"Link text\"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user's question, you can respond normally.",
                    }
                ]
            });

            screenshot_taken = false;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            max_tokens: 1024,
            //seed: 665234,
            messages: messages,
        });

        const message = response.choices[0].message;
        const message_text = message.content;

        messages.push({
            "role": "assistant",
            "content": message_text,
        });

        console.log( "GPT: " + message_text );
        const messageText = "GPT: " + message_text;
        if (currentClient) {
            currentClient.send(JSON.stringify({ type: 'output', message: messageText }));
        }
        if (currentClient) {
            currentClient.send(JSON.stringify({ type: 'complete', message: 'Ready for next input' }));
        }
        if( message_text.indexOf('{"click": "') !== -1 ) {
            let parts = message_text.split('{"click": "');
            parts = parts[1].split('"}');
            const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');

            console.log("Clicking on " + link_text)

            try {
                const elements = await page.waitForSelector('[gpt-link-text]');
                if (element) {
                  await element.click();
                  } else {
                     throw new Error("Couldn't find link");
}
                let partial;
                let exact;

                for( const element of elements ) {
                    const attributeValue = await element.getAttribute('gpt-link-text');

                    if( attributeValue.includes( link_text ) ) {
                        partial = element;
                    }

                    if( attributeValue === link_text ) {
                        exact = element;
                    }
                }

                if( exact ) {
                    await exact.click();
                } else if( partial ) {
                    await partial.click();
                } else {
                    throw new Error( "Can't find link" );
                }

                await Promise.race( [
                    waitForEvent(page, 'load'),
                    sleep(timeout)
                ] );

                await highlight_links( page );

                await page.screenshot( {
                    path: "screenshot.jpg",
                    quality: 100,
                } );

                screenshot_taken = true;
            } catch( error ) {
                console.log( "ERROR: Clicking failed" );

                messages.push({
                    "role": "user",
                    "content": "ERROR: I was unable to click that element",
                });
            }

            continue;
        } else if( message_text.indexOf('{"url": "') !== -1 ) {
            let parts = message_text.split('{"url": "');
            parts = parts[1].split('"}');
            url = parts[0];

            continue;
        }

        const prompt = await input("You: ");
        //console.log();

        messages.push({
            "role": "user",
            "content": prompt,
        });
    }
})();
