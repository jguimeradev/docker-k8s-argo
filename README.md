# User Management System

A simple, lightweight full-stack application featuring a pure HTML/CSS/JS frontend and a Node.js/SQLite backend.

## Backend Architecture

The backend is built using **Node.js** and **Express**, with **SQLite3** as the database engine.

### Core Components (`back/server.js`):
- **Express Server**: Handles routing and middleware.
- **SQLite Database**: Initialized in-memory for this prototype. It automatically creates a `users` table and seeds it with sample data upon startup.
- **Middleware**: 
    - `cors()`: Enables Cross-Origin Resource Sharing, allowing the frontend to communicate with the API.
    - `express.json()`: Parses incoming JSON requests.
    - `express.static()`: Serves the `front/` directory files so the entire app can be accessed from a single port.

### API Design
The REST API follows standard HTTP conventions:

1. **`GET /users`**: 
   - **Purpose**: Retrieves all records from the `users` table.
   - **Database Query**: `SELECT * FROM users`
   - **Response**: A JSON array of user objects.

2. **`GET /user/:id`**: 
   - **Purpose**: Retrieves a specific user's details based on their unique ID.
   - **Database Query**: `SELECT * FROM users WHERE id = ?`
   - **Response**: A single JSON user object or a 404 error if not found.

---

## Frontend-Backend Communication

The application uses a **decoupled communication model** where the frontend communicates with the backend via an Nginx proxy.

1.  **Initial Load**:
    -   When `index.html` loads, `script.js` triggers `fetchUsers()`.
    -   It sends an asynchronous `GET` request to `/api/users`.
    -   Nginx, running in the `frontend_service`, proxies this request to the `backend_service`.
    -   Once the JSON response arrives, JavaScript dynamically generates table rows (`<tr>`) and injects them into the DOM.

2.  **User Details**:
    -   Clicking "View Detail" triggers `viewUser(id)`.
    -   This sends a targeted request to `/api/user/{id}`.
    -   The UI then switches views (hiding the table and showing the detail card) using CSS classes.

---

## How to Run

This application is designed to be run with Docker.

1.  **Build and run the application**:
    ```bash
    docker-compose up --build
    ```

2.  **Access the application**:
    Open [http://localhost:8888](http://localhost:8888) in your browser.

3.  **Stop the application**:
    ```bash
    docker-compose down
    ```


---

## Asynchronous JavaScript: Promises & Async/Await

In modern web development, operations like database queries or network requests are **asynchronous**. This means the program doesn't "freeze" while waiting for a response; instead, it continues executing other code and handles the result once it's ready.

### How it's implemented in this app:

#### 1. Frontend: The `fetch` API and `async/await`
In `front/script.js`, we use the `async/await` syntax to handle API calls. This makes asynchronous code look and behave like synchronous code, making it much easier to read.

```javascript
async function fetchUsers() {
    try {
        // 'await' pauses the function until the promise from fetch() resolves
        const response = await fetch(`${API_URL}/users`);
        
        // Another 'await' for parsing the JSON body
        const users = await response.json();
        
        // Once data is ready, we update the UI
        renderTable(users);
    } catch (err) {
        console.error("Network error:", err);
    }
}
```
*   **`async`**: Marks a function as returning a Promise.
*   **`await`**: Pauses the execution of the `async` function until the Promise is settled (resolved or rejected).
*   **`try/catch`**: The standard way to handle errors in `async` functions.

#### 2. Backend: Callbacks and Event Loop
The backend `back/server.js` uses the **Callback pattern**, which is the foundation of Node.js asynchrony.

```javascript
db.all("SELECT * FROM users", [], (err, rows) => {
    // This function (the callback) runs ONLY after 
    // the database has finished reading the disk.
    if (err) return res.status(500).send(err);
    res.json(rows);
});
```
*   When `db.all` is called, Node.js offloads the database task to the system.
*   The main thread remains free to handle other incoming user requests.
*   When the database is done, the **Event Loop** pushes the callback into the execution queue to send the response.

### Why use it?
Without asynchrony, a single slow database query would block the entire server, preventing any other user from connecting until that one query finished. By using Promises and Callbacks, we ensure the app remains fast and responsive.

