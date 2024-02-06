#!/bin/bash

# Clone the repository
#git clone https://github.com/unconv/gpt4v-browsing.git
#cd gpt4v-browsing/

# Install Python dependencies
pip install -r requirements.txt

# Install NVM and Node.js
#wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
#export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
#[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm


# Install Node.js dependencies
npm install

npm install dotenv
# Download and install Google Chrome
#cd ~/Downloads/
#wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
#sudo apt install ./google-chrome-stable_current_amd64.deb

# Return to the project directory
cd ~/code/vision_crawl/

# Set the OpenAI API key (replace 'your-api-key' with your actual API key)
export OPENAI_API_KEY="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"

# Run the application (optional)
# node vision_crawl.js

nvm use 16
# Install Puppeteer and related packages
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

nvm use 16
