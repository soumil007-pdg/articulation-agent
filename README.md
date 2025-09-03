# Articulate AI Coach

Articulate AI is a web-based personal communication coach that helps users improve their writing and speaking skills. It uses the Google Gemini API to provide real-time feedback, vocabulary enhancements, and structural coaching based on proven communication frameworks like PREP and STAR.

## Features

* **Dynamic Coaching:** Select a goal (e.g., "Interview Answer" or "Persuasive Pitch") and get tailored feedback.
* **Multi-Stage Analysis:** Get a detailed communication score, vocabulary enhancements, and structural improvements.
* **Guided Practice:** Learn powerful communication frameworks and practice them with guided exercises.

## Setup and Installation

Follow these steps to run the project locally.

### Prerequisites

* [Node.js](https://nodejs.org/en/) installed on your machine.
* A valid Google Gemini API key. You can get one from [Google AI Studio](https://ai.google.dev/).

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/articulation-project.git](https://github.com/your-username/articulation-project.git)
    cd articulation-project
    ```

2.  **Install backend dependencies:**
    ```sh
    cd backend
    npm install
    ```

3.  **Set up your API Key:**
    * In the `backend` folder, create a copy of the `api.env.example` file and rename the copy to `api.env`.
    * Open the new `api.env` file and replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API key.

4.  **Run the backend server:**
    ```sh
    node server.js
    ```
    The terminal should show `🟢 Backend server is running perfectly...`.

5.  **Run the frontend:**
    * Navigate to the `frontend` folder and open the `index.html` file in your web browser.

The application should now be fully functional on your local machine!# articulation-agent
