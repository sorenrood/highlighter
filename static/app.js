// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

let pdfDoc = null;
let numPages = 0;
let floatingMenu = null;

function renderPage(num) {
    console.log(`Rendering page ${num}`);
    pdfDoc.getPage(num).then(function(page) {
        page.getTextContent().then(function(textContent) {
            let lastY, textItems = [];
            const lineHeight = 1.2;
            
            textContent.items.forEach(function(item) {
                if (lastY == null || Math.abs(item.transform[5] - lastY) > lineHeight) {
                    textItems.push("\n");
                }
                textItems.push(item.str);
                lastY = item.transform[5];
            });

            let finalString = textItems.join(' ');
            finalString = finalString.replace(/\n+/g, '\n').trim();
            finalString = finalString.replace(/\n/g, '<br>');

            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.innerHTML = `<h3>Page ${num}</h3>${finalString}`;

            document.getElementById('pdf-viewer').appendChild(pageDiv);

            if (num < numPages) {
                renderPage(num + 1);
            }
        }).catch(function(error) {
            console.error(`Error getting text content for page ${num}:`, error);
        });
    }).catch(function(error) {
        console.error(`Error getting page ${num}:`, error);
    });
}

document.getElementById('file-input').addEventListener('change', function(e) {
    console.log("File selected");
    let file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error('Error: Not a PDF file');
        return;
    }

    console.log("Reading file");
    let fileReader = new FileReader();
    fileReader.onload = function() {
        console.log("File read successfully");
        let typedarray = new Uint8Array(this.result);

        console.log("Loading PDF");
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            console.log("PDF loaded successfully");
            pdfDoc = pdf;
            numPages = pdf.numPages;
            document.getElementById('pdf-viewer').innerHTML = '';
            renderPage(1);
        }).catch(function(error) {
            console.error("Error loading PDF:", error);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

function createFloatingMenu(x, y) {
    if (floatingMenu) {
        floatingMenu.remove();
    }
    
    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    floatingMenu.innerHTML = '<button id="expand-btn">Expand</button>';
    
    document.body.appendChild(floatingMenu);
    
    floatingMenu.style.position = 'absolute';
    floatingMenu.style.left = `${x}px`;
    floatingMenu.style.top = `${y}px`;

    document.getElementById('expand-btn').addEventListener('click', handleExpand);
}

function handleExpand() {
    let highlightedText = window.getSelection().toString().trim();
    if (highlightedText) {
        // Show loading indicator
        document.getElementById('loading').style.display = 'block';
        
        // Call API to get summary
        fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({text: highlightedText}),
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            if (data.summary) {
                // Save highlight and summary to local storage
                saveHighlight(highlightedText, data.summary);
                displayHighlights(); // Display highlights in the right pane
            } else {
                console.error('No summary available.');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            document.getElementById('loading').style.display = 'none';
        });
    }
    if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
    }
}

function saveHighlight(text, summary) {
    const highlights = JSON.parse(localStorage.getItem('highlights')) || [];
    highlights.unshift({ text, summary }); // Add new highlight at the top
    localStorage.setItem('highlights', JSON.stringify(highlights));
}

function displayHighlights() {
    const highlights = JSON.parse(localStorage.getItem('highlights')) || [];
    const highlightsContainer = document.getElementById('summary');
    highlightsContainer.innerHTML = ''; // Clear existing highlights

    highlights.forEach(highlight => {
        const highlightDiv = document.createElement('div');
        highlightDiv.className = 'highlight-entry';
        highlightDiv.innerHTML = `<strong>${highlight.text}</strong><br>${highlight.summary}`; // Removed labels
        highlightsContainer.appendChild(highlightDiv);
    });
}

document.getElementById('pdf-viewer').addEventListener('mouseup', function(e) {
    setTimeout(() => {
        let selection = window.getSelection();
        let highlightedText = selection.toString().trim();
        
        if (highlightedText) {
            createFloatingMenu(e.pageX, e.pageY);
        } else if (floatingMenu) {
            floatingMenu.remove();
            floatingMenu = null;
        }
    }, 10);
});

// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Remove any existing fallback menus
    const fallbackMenus = document.querySelectorAll('.floating-menu');
    fallbackMenus.forEach(menu => {
        menu.remove();
    });

    // Show existing highlights on load
    displayHighlights();
});
