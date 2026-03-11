### Frontend Code

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GIOS Environmental Monitoring Platform</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to the GIOS Environmental Monitoring Platform</h1>
        <nav>
            <ul>
                <li><a href="#data">Data Acquisition</a></li>
                <li><a href="#analysis">Analysis</a></li>
                <li><a href="#timeseries">Time-Series</a></li>
                <li><a href="#algal-bloom">Algal Bloom Detection</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <section id="data">
            <h2>Data Acquisition</h2>
            <form id="search-form">
                <label for="bbox">Bounding Box:</label>
                <input type="text" id="bbox" name="bbox" required>
                <label for="start-date">Start Date:</label>
                <input type="date" id="start-date" name="start-date" required>
                <label for="end-date">End Date:</label>
                <input type="date" id="end-date" name="end-date" required>
                <button type="submit">Search</button>
            </form>
            <div id="search-results"></div>
        </section>
        <section id="analysis">
            <h2>Analysis</h2>
            <form id="analysis-form">
                <label for="bbox">Bounding Box:</label>
                <input type="text" id="bbox" name="bbox" required>
                <label for="start-date">Start Date:</label>
                <input type="date" id="start-date" name="start-date" required>
                <label for="end-date">End Date:</label>
                <input type="date" id="end-date" name="end-date" required>
                <label for="index">Index:</label>
                <select id="index" name="index" required>
                    <option value="ndvi">NDVI</option>
                    <option value="evi">EVI</option>
                    <option value="ndwi">NDWI</option>
                    <option value="ndmi">NDMI</option>
                    <option value="lst">LST</option>
                    <option value="algal_bloom">Algal Bloom</option>
                </select>
                <button type="submit">Compute Index</button>
            </form>
            <div id="analysis-results"></div>
        </section>
        <section id="timeseries">
            <h2>Time-Series</h2>
            <form id="timeseries-form">
                <label for="bbox">Bounding Box:</label>
                <input type="text" id="bbox" name="bbox" required>
                <label for="start-date">Start Date:</label>
                <input type="date" id="start-date" name="start-date" required>
                <label for="end-date">End Date:</label>
                <input type="date" id="end-date" name="end-date" required>
                <label for="index">Index:</label>
                <select id="index" name="index" required>
                    <option value="ndvi">NDVI</option>
                    <option value="evi">EVI</option>
                    <option value="ndwi">NDWI</option>
                    <option value="ndmi">NDMI</option>
                    <option value="lst">LST</option>
                </select>
                <button type="submit">Compute Time-Series</button>
            </form>
            <div id="timeseries-results"></div>
        </section>
        <section id="algal-bloom">
            <h2>Algal Bloom Detection</h2>
            <form id="algal-bloom-form">
                <label for="bbox">Bounding Box:</label>
                <input type="text" id="bbox" name="bbox" required>
                <label for="start-date">Start Date:</label>
                <input type="date" id="start-date" name="start-date" required>
                <label for="end-date">End Date:</label>
                <input type="date" id="end-date" name="end-date" required>
                <label for="threshold">Sensitivity Threshold:</label>
                <input type="number" id="threshold" name="threshold" required min="0.0" max="1.0" step="0.01">
                <button type="submit">Detect Algal Bloom</button>
            </form>
            <div id="algal-bloom-results"></div>
        </section>
    </main>
    <script src="script.js"></script>
</body>
</html>
```

#### `styles.css`

```css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f0f0;
}

header {
    background-color: #333;
    color: white;
    padding: 1rem;
    text-align: center;
}

nav ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
}

nav ul li {
    display: inline;
    margin-right: 1rem;
}

nav ul li a {
    color: white;
    text-decoration: none;
}

main {
    width: 80%;
    padding: 2rem;
    background-color: #fff;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

form {
    margin-bottom: 1rem;
}

form label {
    display: block;
    margin-bottom: 0.5rem;
}

form input, form select {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

form button {
    width: 100%;
    padding: 0.5rem 1rem;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

form button:hover {
    background-color: #555;
}

#search-results, #analysis-results, #timeseries-results, #algal-bloom-results {
    margin-top: 2rem;
    padding: 2rem;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
```

#### `script.js`

```javascript
// JavaScript to handle form submissions and fetch API data

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const analysisForm = document.getElementById('analysis-form');
    const timeseriesForm = document.getElementById('timeseries-form');
    const algalBloomForm = document.getElementById('algal-bloom-form');

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bbox = document.getElementById('bbox').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const url = `/data/search?bbox=${bbox}&start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                document.getElementById('search-results').innerHTML = `
                    <h2>Search Results</h2>
                    <ul>
                        ${data.scenes.map(scene => `
                            <li>${scene.scene_id} - ${scene.datetime}</li>
                        `).join('')}
                    </ul>
                `;
            })
            .catch(error => console.error('Error fetching data:', error));
    });

    analysisForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bbox = document.getElementById('bbox').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const index = document.getElementById('index').value;
        const url = `/analysis/${index}?bbox=${bbox}&start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                document.getElementById('analysis-results').innerHTML = `
                    <h2>Analysis Results</h2>
                    <ul>
                        ${data.results.map(result => `
                            <li>${result.index} - ${result.mean} - ${result.timestamp}</li>
                        `).join('')}
                    </ul>
                `;
            })
            .catch(error => console.error('Error fetching data:', error));
    });

    timeseriesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bbox = document.getElementById('bbox').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const index = document.getElementById('index').value;
        const url = `/timeseries/${index}?bbox=${bbox}&start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                document.getElementById('timeseries-results').innerHTML = `
                    <h2>Time-Series Results</h2>
                    <ul>
                        ${data.composites.map(composite => `
                            <li>${composite.time} - ${composite.mean} - ${composite.timestamp}</li>
                        `).join('')}
                    </ul>
                `;
            })
            .catch(error => console.error('Error fetching data:', error));
    });

    algalBloomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bbox = document.getElementById('bbox').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const threshold = document.getElementById('threshold').value;
        const url = `/algal-bloom?bbox=${bbox}&start_date=${startDate}&end_date=${endDate}&threshold=${threshold}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                document.getElementById('algal-bloom-results').innerHTML = `
                    <h2>Algal Bloom Results</h2>
                    <ul>
                        <li>${data.index} - ${data.percent_change}%</li>
                    </ul>
                `;
            })
            .catch(error => console.error('Error fetching data:', error));
    });
});
```

### Explanation

1. **HTML Structure**: The HTML structure includes a main container with sections for data acquisition, analysis, time-series, and algal bloom detection. Each section contains a form with input fields and a submit button to trigger data retrieval. The results are displayed in a separate section using `div` elements.

2. **CSS Styling**: The CSS styles provide a clean, modern look for the front-end. The layout is centered, and navigation links are styled to be visually appealing.

3. **JavaScript Logic**: The JavaScript code handles form submissions to fetch data from the backend API. It uses `fetch` to make HTTP requests and updates the results in the respective sections.

4. **Backend API Integration**: The JavaScript uses the `fetch` API to make requests to the backend API endpoints for data acquisition, analysis, time-series, and algal bloom detection. The responses are then displayed on the front-end.

5. **Security Considerations**: The backend is protected by environment variables, and CORS is configured to allow requests from the frontend domain. The API keys and other sensitive data are managed securely with environment variables.

6. **Performance Considerations**: The use of `xarray` for handling large datasets and `diskcache` for caching operations ensures efficient handling and retrieval of data. The JavaScript code uses async/await for handling asynchronous requests and updates the UI accordingly.

7. **Error Handling**: The JavaScript includes basic error handling to catch and log any issues that occur during data retrieval or processing.