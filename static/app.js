// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

let pdfDoc = null;
let numPages = 0;

function renderPage(num) {
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
            
            // Replace multiple newlines with a single one and trim
            finalString = finalString.replace(/\n+/g, '\n').trim();
            
            // Convert newlines to <br> tags
            finalString = finalString.replace(/\n/g, '<br>');

            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.innerHTML = `<h3>Page ${num}</h3>${finalString}`;

            document.getElementById('pdf-viewer').appendChild(pageDiv);

            // Load next page if available
            if (num < numPages) {
                renderPage(num + 1);
            }
        });
    });
}

document.getElementById('file-input').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error('Error: Not a PDF file');
        return;
    }

    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            numPages = pdf.numPages;
            document.getElementById('pdf-viewer').innerHTML = ''; // Clear previous content
            renderPage(1);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

document.getElementById('pdf-viewer').addEventListener('mouseup', function() {
    let selection = window.getSelection();
    let highlightedText = selection.toString();
    
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
});
