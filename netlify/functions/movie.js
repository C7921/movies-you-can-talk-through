// Netlify function for movie details
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

    // Get movie ID from the path parameter
    const path = event.path;
    const pathParts = path.split("/");
    const movieId = pathParts[pathParts.length - 1];

    if (!movieId || isNaN(movieId)) {
      throw new Error("Invalid or missing movie ID");
    }

    // Build TMDB API URL for movie details
    const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`;

    console.log("Making movie details request to TMDB for movie ID:", movieId);

    // Call the TMDB API
    const response = await axios.get(tmdbUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error in movie details function:", error);
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
