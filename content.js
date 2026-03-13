(() => {
    const masterFrame = window === window.top; // Check if current frame is master
    const searchResults = new Set(); // To avoid duplicate popups

    function handleSearch(query) {
        const frames = masterFrame ? Array.from(document.getElementsByTagName('iframe')) : null;

        if (frames) {
            frames.forEach(frame => {
                try {
                    const frameWindow = frame.contentWindow;

                    // Post message to slave frames
                    frameWindow.postMessage({ type: 'search', query: query }, '*');
                } catch (error) {
                    console.error('Cannot access iframe:', error);
                }
            });
        } else {
            // Perform search in the current frame and catch results
            const results = performSearch(query);
            displayResults(results);
        }
    }

    function performSearch(query) {
        // Logic for searching content in the current frame
        const regex = new RegExp(query, 'g');
        const matches = document.body.innerHTML.match(regex);
        return matches || [];
    }

    function displayResults(results) {
        results.forEach(result => {
            if (!searchResults.has(result)) {
                searchResults.add(result);
                alert(`Found: ${result}`); // Replace with a more sophisticated display mechanism if needed
            }
        });
    }

    window.addEventListener('message', (event) => {
        if (event.data.type === 'search') {
            handleSearch(event.data.query);
        }
    });

    // Example usage: initiate a search when required
    // handleSearch('your search query');
})();