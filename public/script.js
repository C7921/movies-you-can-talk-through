/**
 * "Movies You Can Talk Through" - Main JavaScript
 * This script handles movie data fetching, display, and local storage management
 * Using TMDB API for movie data and posters
 */

// TMDB API Constants
const TMDB_API_KEY = window.TMDB_API_KEY; // This comes from api-config.js
const TMDB_API_URL = "https://api.themoviedb.org/3";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
const LOCAL_STORAGE_KEY = "movieCollection";

// DOM Elements
const movieForm = document.getElementById("movie-form");
const movieTitleInput = document.getElementById("movie-title");
const movieYearInput = document.getElementById("movie-year");
const moviesContainer = document.getElementById("movies-container");
const loadingElement = document.getElementById("loading");
const errorMessageElement = document.getElementById("error-message");
const movieTemplate = document.getElementById("movie-template");

// Movie collection array
let movieCollection = [];

/**
 * Initialize the application
 */
function init() {
  // Check if API key is available
  if (!TMDB_API_KEY) {
    showError(
      "API key not found. Please check your .env file and run the build script."
    );
    console.error(
      "TMDB_API_KEY is missing - application will not function correctly"
    );
    return;
  }

  console.log("Initializing Movies You Can Talk Through app...");
  loadMovies();

  // Set up event listeners
  movieForm.addEventListener("submit", handleFormSubmit);
  moviesContainer.addEventListener("click", handleMovieRemoval);

  // Add a debug button
  createDebugButton();
}

/**
 * Create a debug button to help with development
 */
function createDebugButton() {
  const debugButton = document.createElement("button");
  debugButton.id = "debug-toggle";
  debugButton.textContent = "Debug";
  debugButton.onclick = toggleDebugPanel;
  document.body.appendChild(debugButton);

  const debugPanel = document.createElement("div");
  debugPanel.id = "debug-panel";
  debugPanel.style.display = "none";
  document.body.appendChild(debugPanel);

  updateDebugPanel();
}

/**
 * Toggle the debug panel visibility
 */
function toggleDebugPanel() {
  const panel = document.getElementById("debug-panel");
  if (panel.style.display === "none") {
    panel.style.display = "block";
    document.getElementById("debug-toggle").textContent = "Hide Debug";
    updateDebugPanel();
  } else {
    panel.style.display = "none";
    document.getElementById("debug-toggle").textContent = "Debug";
  }
}

/**
 * Update the debug panel with current information
 */
function updateDebugPanel() {
  const panel = document.getElementById("debug-panel");
  if (!panel) return;

  let content = "<h3>Debug Information</h3>";

  // API key status
  content += "<h4>API Configuration:</h4>";
  content += `<p>API Key status: ${
    TMDB_API_KEY ? "✅ Found" : "❌ Missing"
  }</p>`;
  if (TMDB_API_KEY) {
    // Only show a few characters for security
    const maskedKey =
      TMDB_API_KEY.substring(0, 3) +
      "..." +
      TMDB_API_KEY.substring(TMDB_API_KEY.length - 3);
    content += `<p>API Key (masked): ${maskedKey}</p>`;
  }

  // Local storage
  content += "<h4>Local Storage:</h4>";
  try {
    const moviesData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (moviesData) {
      const movies = JSON.parse(moviesData);
      content += `<p>Saved movies: ${movies.length}</p>`;
    } else {
      content += "<p>No saved movies in local storage</p>";
    }
  } catch (e) {
    content += `<p>Error reading local storage: ${e.message}</p>`;
  }

  // Environment
  content += "<h4>Environment:</h4>";
  content += `<p>URL: ${window.location.href}</p>`;
  content += `<p>User Agent: ${navigator.userAgent}</p>`;

  // Test API connection button
  content += "<h4>Actions:</h4>";
  content += `<button onclick="testApiConnection()">Test TMDB API Connection</button>`;
  content += `<div id="api-test-result"></div>`;

  panel.innerHTML = content;
}

/**
 * Test the connection to the TMDB API
 */
async function testApiConnection() {
  const resultElement = document.getElementById("api-test-result");
  resultElement.innerHTML = "<p>Testing API connection...</p>";

  try {
    if (!TMDB_API_KEY) {
      throw new Error("API key is not defined");
    }

    const response = await fetch(
      `${TMDB_API_URL}/configuration?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API Error: ${response.status} - ${
          errorData.status_message || response.statusText
        }`
      );
    }

    const data = await response.json();
    resultElement.innerHTML = `<p style="color:green">✅ API connection successful!</p>
      <p>Base URL: ${data.images.secure_base_url}</p>
      <p>Poster sizes: ${data.images.poster_sizes.join(", ")}</p>`;
  } catch (error) {
    resultElement.innerHTML = `<p style="color:red">❌ API Connection Failed: ${error.message}</p>`;
    console.error("API test error:", error);
  }
}

/**
 * Handle form submission to add a new movie
 * @param {Event} event
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const title = movieTitleInput.value.trim();
  const year = movieYearInput.value.trim();

  if (!title) {
    showError("Please enter a movie title");
    return;
  }

  try {
    showLoading(true);
    hideError();

    // Fetch movie data from TMDB API
    const movieData = await fetchMovieData(title, year);

    if (!movieData) {
      throw new Error(
        "Movie not found. Try adding the year for more specific results."
      );
    }

    // Check if movie already exists in collection
    if (movieCollection.some((movie) => movie.id === movieData.id)) {
      throw new Error("This movie is already in your collection");
    }

    // Add movie to collection
    addMovieToCollection(movieData);

    // Reset form
    movieForm.reset();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Fetch movie data from TMDB API
 * @param {string} title - Movie title
 * @param {string} year - Release year (optional)
 * @returns {Promise<Object>} - Movie data
 */
async function fetchMovieData(title, year) {
  try {
    // Verify API key is available
    if (!TMDB_API_KEY) {
      throw new Error("API key is missing or invalid");
    }

    // Build the TMDB API URL directly - this is the key change
    let searchUrl = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}&include_adult=false`;

    // Add year parameter if provided
    if (year) {
      searchUrl += `&year=${encodeURIComponent(year)}`;
    }

    console.log(
      "Making API request to TMDB...",
      searchUrl.replace(TMDB_API_KEY, "API_KEY_HIDDEN")
    );
    const response = await fetch(searchUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        `API Error: ${response.status} - ${
          errorData.status_message || response.statusText
        }`
      );
    }

    const data = await response.json();
    console.log(
      "API response received successfully",
      data.results?.length,
      "results found"
    );

    // Check if we have results
    if (data.results && data.results.length > 0) {
      // Get the first (most relevant) result
      const movie = data.results[0];

      try {
        // Get more details about the movie
        const detailsResponse = await fetch(
          `${TMDB_API_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`
        );

        if (!detailsResponse.ok) {
          console.warn(
            "Could not fetch detailed movie information, using basic info instead"
          );
          return createMovieObject(movie); // Fallback to search result if details fail
        }

        const details = await detailsResponse.json();
        return createMovieObject(details);
      } catch (detailsError) {
        console.warn("Error fetching movie details:", detailsError);
        return createMovieObject(movie); // Fallback to search result if details fail
      }
    }

    console.warn("No results found for movie:", title);
    return null; // No results found
  } catch (error) {
    console.error("Error fetching movie data:", error);

    // More specific error message for the user
    if (error.message.includes("API Error: 401")) {
      throw new Error(
        "API key authentication failed. Please check your API key configuration."
      );
    } else if (error.message.includes("API Error: 403")) {
      throw new Error(
        "Access to TMDB API is forbidden. Your API key might have restrictions."
      );
    } else if (error.message.includes("API Error: 404")) {
      throw new Error("TMDB API endpoint not found. Please check the API URL.");
    } else {
      throw error;
    }
  }
}

/**
 * Create a simplified movie object with the data we need
 * @param {Object} movieData - Raw movie data from TMDB
 * @returns {Object} - Simplified movie object
 */
function createMovieObject(movieData) {
  return {
    id: movieData.id,
    title: movieData.title,
    year: movieData.release_date
      ? movieData.release_date.substring(0, 4)
      : "Unknown",
    poster: movieData.poster_path
      ? `${POSTER_BASE_URL}${movieData.poster_path}`
      : "./placeholder.svg",
    overview: movieData.overview || "",
    director: movieData.director || "Unknown", // TMDB doesn't provide this in basic search
  };
}

/**
 * Add a movie to the collection and update UI
 * @param {Object} movieData - Movie data from TMDB API
 */
function addMovieToCollection(movieData) {
  // Add to collection array
  movieCollection.push(movieData);

  // Save to local storage
  saveMovies();

  // Update UI
  renderMovies();
}

/**
 * Handle movie removal when delete button is clicked
 * @param {Event} event - Click event
 */
function handleMovieRemoval(event) {
  // Check if the clicked element is a remove button
  if (event.target.closest(".remove-btn")) {
    const movieCard = event.target.closest(".movie-card");
    const movieId = parseInt(movieCard.dataset.id, 10);

    // Remove movie from collection
    movieCollection = movieCollection.filter((movie) => movie.id !== movieId);

    // Update local storage and UI
    saveMovies();
    renderMovies();
  }
}

/**
 * Load movies from local storage
 */
function loadMovies() {
  const savedMovies = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (savedMovies) {
    try {
      movieCollection = JSON.parse(savedMovies);
      renderMovies();
    } catch (error) {
      console.error("Error loading saved movies:", error);
      // Clear corrupted data
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      movieCollection = [];
    }
  }
}

/**
 * Save movies to local storage
 */
function saveMovies() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(movieCollection));
}

/**
 * Render all movies in the collection
 */
function renderMovies() {
  // Clear current content
  moviesContainer.innerHTML = "";

  // Check if collection is empty
  if (movieCollection.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML =
      "<p>No movies added yet. Add your first movie above!</p>";
    moviesContainer.appendChild(emptyState);
    return;
  }

  // Render each movie
  movieCollection.forEach((movie) => {
    const movieElement = createMovieElement(movie);
    moviesContainer.appendChild(movieElement);
  });
}

/**
 * Create a movie element from template
 * @param {Object} movie - Movie data
 * @returns {HTMLElement} - Movie card element
 */
function createMovieElement(movie) {
  // Clone template
  const movieElement = document
    .importNode(movieTemplate.content, true)
    .querySelector(".movie-card");

  // Set movie data
  movieElement.dataset.id = movie.id;
  movieElement.querySelector(".movie-title").textContent = movie.title;
  movieElement.querySelector(".movie-year").textContent = movie.year;

  const posterElement = movieElement.querySelector(".movie-poster");
  posterElement.src = movie.poster;
  posterElement.alt = `${movie.title} poster`;

  // Handle poster loading errors
  posterElement.onerror = function () {
    this.src = "placeholder.svg";
  };

  return movieElement;
}

/**
 * Show or hide loading indicator
 * @param {boolean} isLoading - Whether to show or hide
 */
function showLoading(isLoading) {
  loadingElement.classList.toggle("hidden", !isLoading);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  errorMessageElement.textContent = message;
  errorMessageElement.classList.remove("hidden");
}

/**
 * Hide error message
 */
function hideError() {
  errorMessageElement.classList.add("hidden");
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
