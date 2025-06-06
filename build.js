/**
 * Build script for Movies You Can Talk Through
 * Creates the api-config.js file with the TMDB API key from .env
 */
const fs = require("fs");
require("dotenv").config();

// Get the API key from .env file
const apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "❌ Error: TMDB_API_KEY not found in .env file"
  );
  console.error("Please create a .env file with your TMDB API key like this:");
  console.error("TMDB_API_KEY=your_api_key_here");
  console.error(
    "You can get an API key from https://www.themoviedb.org/settings/api"
  );
  process.exit(1);
}

// Create the api-config.js file in the public directory
const configContent = `/**
 * API Configuration - Generated by build script
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT OR COMMIT THIS FILE
 */
window.TMDB_API_KEY = "${apiKey}";
console.log("API configuration loaded successfully");`;

// Make sure the public directory exists
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

// Write to file
fs.writeFileSync("public/api-config.js", configContent);
console.log(
  "\x1b[32m%s\x1b[0m",
  "✅ api-config.js created with environment variables"
);
