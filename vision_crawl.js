import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import readline from 'readline';
import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config()

console.log(process.env.OPENAI_API_KEY);

import OpenAI from "openai";

const openai = new OpenAI();

puppeteer.use(StealthPlugin());

const timeout = 8000;

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

async function input( text ) {
    let the_prompt;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await (async () => {
        return new Promise( resolve => {
            rl.question( text, (prompt) => {
                the_prompt = prompt;
                rl.close();
                resolve();
            } );
        } );
    })();

    return the_prompt;
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

async function clickOnElement(elem, x = null, y = null) {
    const rect = await page.evaluate(el => {
      const { top, left, width, height } = el.getBoundingClientRect();
      return { top, left, width, height };
    }, elem);

    // Use given position or default to center
    const _x = x !== null ? x : rect.width / 2;
    const _y = y !== null ? y : rect.height / 2;

    await page.mouse.click(rect.left + _x, rect.top + _y);
  }

async function clickAroundElement(page, elem, attempts = 5) {
    const rect = await page.evaluate(el => {
        const {top, left, width, height} = el.getBoundingClientRect();
        return {top, left, width, height};
    }, elem);

    for (let i = 0; i < attempts; i++) {
        // Calculate a small random offset for each click to simulate clicking around the element
        const offsetX = (Math.random() - 0.5) * 20; // Adjusts the range of -10 to +10 pixels
        const offsetY = (Math.random() - 0.5) * 20; // Adjusts the range of -10 to +10 pixels

        const clickX = rect.left + rect.width / 2 + offsetX;
        const clickY = rect.top + rect.height / 2 + offsetY;

        await page.mouse.click(clickX, clickY);

        // Optionally, wait a bit between clicks to allow the page to respond
        await page.waitForTimeout(100); // Adjust the delay as needed
    }
}


(async () => {
    console.log( "###########################################" );
    console.log( "# Forked from Unconventional Coding #" );

    console.log( "# Improvements by AISORTED #" );
    console.log( "###########################################\n" );

    const browser = await puppeteer.launch( {
        headless: false,
    } );

    const page = await browser.newPage();


    page.on('console', msg => {
        if (msg.type() === 'error') { // Filter for console errors
            console.log('CONSOLE ERROR:', msg.text());
        }
    });

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
    console.log();

    messages.push({
        "role": "user",
        "content": prompt,
    });

    let url;
    let screenshot_taken = false;

    while( true ) {
        if( url ) {
            console.log("Crawling " + url);
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

        if( message_text.indexOf('{"click": "') !== -1 ) {
            let parts = message_text.split('{"click": "');
            parts = parts[1].split('"}');
            const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');
            console.log("Unsanitized target: " + link_text)
            try {
                const elements = await page.$$('[gpt-link-text]');
                console.log(`Found ${elements.length} elements`);
                if (elements.length === 0) {
                    console.log('No elements found with the attribute "gpt-link-text".');
                }
                let clicked = false;

                let partial;
                let exact;

                function sanitizeText(text) {
                    // Example sanitization: Lowercase and remove non-alphanumeric characters (except spaces)
                    return text.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
                }

                function extractFirstFiveWords(text) {
                    const words = text.split(' ').filter(Boolean); // Split by space and remove any empty strings
                    return words.slice(0, 5); // Return the first five words as an array
                }

                function containsAllWords(baseText, targetWords) {
                    const baseWordsSet = new Set(baseText.split(' ')); // Create a set of words from base text for efficient lookup
                    return targetWords.every(word => baseWordsSet.has(word)); // Check if every target word is in the base words set
                }

                // Apply both sanitization and extraction to link_text
                const link_text = parts[0]; // Assuming parts[0] contains the text to click
                const sanitizedLinkText = sanitizeText(link_text);
                const firstFiveWords = extractFirstFiveWords(sanitizedLinkText); // Extracts first five words after sanitization
                //console.log("Searching for the first five words in page elements: " + firstFiveWords.join(' '));

                for (const element of elements) {
                    let attributeValue = await page.evaluate(el => el.getAttribute('gpt-link-text'), element);
                    let sanitizedAttributeValue = sanitizeText(attributeValue); // Sanitize the attribute value

                    //console.log("Element: " + sanitizedAttributeValue);
                    if (sanitizedAttributeValue) {
                        if (containsAllWords(sanitizedAttributeValue, firstFiveWords)) { // Check if sanitized attribute value contains all first five words
                            console.log("Match found. Attempting to click...");
                            // Continue with the click logic here
                            const box = await element.boundingBox();
                            await page.waitForTimeout(1000);
                            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        } else {
                            //console.log("No match found.");
                        }
                    }
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
        console.log();

        messages.push({
            "role": "user",
            "content": prompt,
        });
    }
})();
