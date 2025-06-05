#!/bin/sh

# Install dependencies
cd server && npm install

# Start the server
node --experimental-modules server.js
