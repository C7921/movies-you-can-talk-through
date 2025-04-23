// Serverless function to proxy TMDB API requests
const axios = require("axios");

exports.handler = async (event) => {
  // Set up CORS headers for browser requests
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "{}" };
  }

  try {
    // Get the API key from environment variable
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("API key is not configured in environment variables");
    }

    // Log the event for debugging
    console.log("Event path:", event.path);
    console.log("Query parameters:", event.queryStringParameters);

    // Extract the endpoint from the path
    // Format of event.path will be: /.netlify/functions/tmdb-api/search/movie
    // We need to extract "search/movie" from it
    let endpoint = "";

    if (event.path.includes("/.netlify/functions/tmdb-api/")) {
      // Direct access to function URL
      endpoint = event.path.split("/.netlify/functions/tmdb-api/")[1];
    } else if (event.path.includes("/api/")) {
      // Access via the redirect rule
      endpoint = event.path.split("/api/")[1];
    }

    // If no endpoint was extracted, default to a basic endpoint
    if (!endpoint) {
      console.log("No endpoint found in path, using default");
      endpoint = "search/movie";
    }

    console.log("Extracted endpoint:", endpoint);

    // Build the TMDB URL
    let tmdbUrl = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}`;

    // Add any query parameters
    const params = event.queryStringParameters;
    if (params) {
      Object.keys(params).forEach((key) => {
        tmdbUrl += `&${key}=${encodeURIComponent(params[key])}`;
      });
    }

    // Log the URL (with masked API key for security)
    console.log("TMDB URL:", tmdbUrl.replace(apiKey, "API_KEY_HIDDEN"));

    // Make the request to TMDB
    const response = await axios.get(tmdbUrl);

    // Return the data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error in TMDB API function:", error);

    // Determine the appropriate status code
    const statusCode = error.response?.status || 500;

    // Get detailed error information if available
    const errorMessage =
      error.response?.data?.status_message ||
      error.message ||
      "Unknown error occurred";

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        path: event.path,
        params: event.queryStringParameters,
      }),
    };
  }
};
