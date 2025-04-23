// Netlify function for movie search
const axios = require("axios");

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "{}" };
  }

  try {
    // Get API key from environment variables
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB API key not configured");
    }

    // Build TMDB API URL for movie search
    let tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}`;

    // Add query parameters
    const params = event.queryStringParameters;
    if (params) {
      Object.keys(params).forEach((key) => {
        tmdbUrl += `&${key}=${encodeURIComponent(params[key])}`;
      });
    } else if (!params || !params.query) {
      throw new Error("Missing query parameter");
    }

    console.log(
      "Making search request to TMDB",
      tmdbUrl.replace(apiKey, "[API_KEY_HIDDEN]")
    );

    // Call the TMDB API
    const response = await axios.get(tmdbUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error in search function:", error);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error:
          error.response?.data?.status_message ||
          error.message ||
          "Unknown error",
      }),
    };
  }
};
