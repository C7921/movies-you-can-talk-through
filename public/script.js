/**
 * "Movies You Can Talk Through" - Main JavaScript
 * This script handles movie data fetching, display, and local storage management
 */

// API Constants
const API_BASE_URL = "/api"; // This will be redirected to Netlify Functions
const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
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
  console.log("Initializing Movies You Can Talk Through app...");
  loadMovies();

  // Set up event listeners
  movieForm.addEventListener("submit", handleFormSubmit);
  moviesContainer.addEventListener("click", handleMovieRemoval);
}

/**
 * Handle form submission to add a new movie
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

    console.log("Searching for movie:", title, year ? `(${year})` : "");

    // Fetch movie data through the Netlify function
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
 * Fetch movie data from TMDB API via Netlify Function
 */
async function fetchMovieData(title, year) {
  try {
    // Build query parameters
    let queryParams = `query=${encodeURIComponent(title)}&include_adult=false`;
    if (year) {
      queryParams += `&year=${encodeURIComponent(year)}`;
    }

    console.log(
      "Making API request to:",
      `${API_BASE_URL}/search/movie?${queryParams}`
    );

    // Fetch from our serverless function
    const response = await fetch(`${API_BASE_URL}/search/movie?${queryParams}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        `API Error: ${response.status} - ${
          errorData.error || response.statusText
        }`
      );
    }

    const data = await response.json();
    console.log("Search results:", data.results?.length || 0);

    // Check if we have results
    if (data.results && data.results.length > 0) {
      // Get the first (most relevant) result
      const movie = data.results[0];

      try {
        // Get more details about the movie
        const detailsResponse = await fetch(
          `${API_BASE_URL}/movie/${movie.id}`
        );

        if (!detailsResponse.ok) {
          return createMovieObject(movie);
        }

        const details = await detailsResponse.json();
        return createMovieObject(details);
      } catch (error) {
        console.warn("Error fetching movie details:", error);
        return createMovieObject(movie);
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching movie data:", error);
    throw error;
  }
}

/**
 * Create a simplified movie object with the data we need
 */
function createMovieObject(movieData) {
  return {
    id: movieData.id,
    title: movieData.title,
    year: movieData.release_date
      ? movieData.release_date.substring(0, 4)
      : "Unknown",
    poster: movieData.poster_path
      ? `${TMDB_POSTER_BASE_URL}${movieData.poster_path}`
      : "placeholder.svg",
    overview: movieData.overview || "",
    director: movieData.director || "Unknown",
  };
}

/**
 * Add a movie to the collection and update UI
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
 */
function showLoading(isLoading) {
  loadingElement.classList.toggle("hidden", !isLoading);
}

/**
 * Show error message
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
