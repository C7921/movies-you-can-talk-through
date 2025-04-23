// Serverless function to proxy TMDB API requests
const axios = require('axios');

exports.handler = async (event) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '{}' };
  }

  try {
    // Get the API key from environment variable
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Extract the endpoint and parameters from the path
    const pathSegments = event.path.split('/');
    const endpoint = pathSegments[pathSegments.length - 1];
    
    // Build the TMDB URL
    let tmdbUrl = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}`;
    
    // Add any query parameters from the request
    const params = event.queryStringParameters;
    if (params) {
      Object.keys(params).forEach(key => {
        tmdbUrl += `&${key}=${encodeURIComponent(params[key])}`;
      });
    }

    // Make the request to TMDB
    const response = await axios.get(tmdbUrl);
    
    // Return the data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.log('Error:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.status_message || 'Unknown error occurred'
      })
    };
  }
};
