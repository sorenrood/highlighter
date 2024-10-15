// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

let pdfDoc = null;
let numPages = 0;
let floatingMenu = null;
let highlightedRange = null;

function renderPage(num) {
    console.log(`Rendering page ${num}`);
    pdfDoc.getPage(num).then(function(page) {
        console.log(`Got page ${num}`);
        page.getTextContent().then(function(textContent) {
            console.log(`Got text content for page ${num}`);
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
            console.log(`Page ${num} rendered`);

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

function createFloatingMenu(range) {
    if (floatingMenu) {
        document.body.removeChild(floatingMenu);
    }
    
    highlightedRange = range;
    
    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    floatingMenu.innerHTML = '<button id="expand-btn">Expand</button>';
    
    document.body.appendChild(floatingMenu);
    
    document.getElementById('expand-btn').addEventListener('click', handleExpand);
    
    positionFloatingMenu();
}

function positionFloatingMenu() {
    if (!floatingMenu || !highlightedRange) return;
    
    const rect = highlightedRange.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    floatingMenu.style.left = `${rect.left}px`;
    floatingMenu.style.top = `${rect.top + scrollTop - floatingMenu.offsetHeight - 10}px`;
}

function handleExpand() {
    let highlightedText = window.getSelection().toString();
    if (highlightedText) {
        document.getElementById('highlighted-text').textContent = highlightedText;
        
        // Show loading indicator
        document.getElementById('loading').style.display = 'block';
        document.getElementById('summary').textContent = '';
        
        // Call API to get summary
        fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({text: highlightedText}),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received summary:', data);
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            if (data.summary) {
                // Replace newlines with <br> tags and preserve other HTML formatting
                const formattedSummary = data.summary
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/- (.*?)(?=\n|$)/g, '<li>$1</li>')
                    .replace(/<li>.*?<\/li>/g, match => `<ul>${match}</ul>`);
                document.getElementById('summary').innerHTML = formattedSummary;
            } else {
                document.getElementById('summary').textContent = 'No summary available.';
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            document.getElementById('summary').textContent = 'Error fetching summary.';
        });
    }
    if (floatingMenu) {
        document.body.removeChild(floatingMenu);
        floatingMenu = null;
        highlightedRange = null;
    }
}

document.getElementById('pdf-viewer').addEventListener('mouseup', function(e) {
    setTimeout(() => {
        let selection = window.getSelection();
        let highlightedText = selection.toString().trim();
        
        if (highlightedText) {
            let range = selection.getRangeAt(0);
            createFloatingMenu(range);
        } else if (floatingMenu) {
            document.body.removeChild(floatingMenu);
            floatingMenu = null;
            highlightedRange = null;
        }
    }, 10);
});

// Handle scrolling
window.addEventListener('scroll', function() {
    if (floatingMenu && highlightedRange) {
        positionFloatingMenu();
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (floatingMenu && highlightedRange) {
        positionFloatingMenu();
    }
});

// Remove any existing fallback menus
document.addEventListener('DOMContentLoaded', function() {
    const fallbackMenus = document.querySelectorAll('.floating-menu');
    fallbackMenus.forEach(menu => {
        if (menu.style.position === 'fixed' && menu.style.top === '10px' && menu.style.right === '10px') {
            menu.remove();
        }
    });
});
