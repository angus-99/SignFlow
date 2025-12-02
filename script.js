// DOM Elements
const pdfUploadInput = document.getElementById('pdf-upload');
const savePdfBtn = document.getElementById('save-pdf-btn');
const pdfWrapper = document.getElementById('pdf-wrapper');
const signaturePadCanvas = document.getElementById('signature-pad');
const clearSigBtn = document.getElementById('clear-sig-btn');
const addSigBtn = document.getElementById('add-sig-btn');

// State
let pdfDoc = null;
let pdfBytes = null;
let scale = 1.5; // Render scale
let signaturePad = null;
let signatures = []; // Array to track added signatures { element, pageIndex, x, y }

// Initialize Signature Pad
function initSignaturePad() {
    // Resize canvas to fit container
    const container = signaturePadCanvas.parentElement;
    signaturePadCanvas.width = container.clientWidth;
    signaturePadCanvas.height = container.clientHeight;

    signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)', // Transparent
        penColor: 'rgb(0, 0, 0)'
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    // Pop-out / Fullscreen
    const popOutBtn = document.getElementById('pop-out-btn');

    popOutBtn.addEventListener('click', () => {
        // Open new window
        const width = 600;
        const height = 400;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        window.open('pad.html', 'SignFlowPad',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no`
        );
    });

    // Listen for messages from popup
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'ADD_SIGNATURE') {
            addSignatureToLastPage(event.data.data);
        }
    });
}

function resizeCanvas() {
    const container = signaturePadCanvas.parentElement;

    // Save current content
    const data = signaturePad.toData();

    signaturePadCanvas.width = container.clientWidth;
    signaturePadCanvas.height = container.clientHeight;

    // Restore content (scaled if needed, but for now just redraw)
    signaturePad.clear();
    signaturePad.fromData(data);
}

// Handle PDF Upload
pdfUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        // Store the original buffer for saving
        pdfBytes = arrayBuffer;

        // Load PDF with PDF.js
        // IMPORTANT: Pass a copy (slice) to PDF.js because it transfers/detaches the buffer to its worker
        const loadingTask = pdfjsLib.getDocument(arrayBuffer.slice(0));
        pdfDoc = await loadingTask.promise;

        renderPDF();
        savePdfBtn.disabled = false;
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. See console for details.');
    }
});

// Render PDF Pages
async function renderPDF() {
    pdfWrapper.innerHTML = ''; // Clear existing
    signatures = []; // Clear signatures

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        // Create Container
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container';
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.dataset.pageIndex = i - 1; // 0-based index

        // Create Canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        pageContainer.appendChild(canvas);
        pdfWrapper.appendChild(pageContainer);
    }
}

// Signature Pad Controls
clearSigBtn.addEventListener('click', () => {
    signaturePad.clear();
});

addSigBtn.addEventListener('click', async () => {
    if (signaturePad.isEmpty()) {
        alert('Please sign first.');
        return;
    }

    const dataURL = signaturePad.toDataURL('image/png');
    await addSignatureToLastPage(dataURL);
});

// Add Signature to Last Page with Auto-positioning
async function addSignatureToLastPage(dataURL) {
    if (!pdfDoc) {
        alert('Please upload a PDF first.');
        return;
    }

    const pageIndex = pdfDoc.numPages - 1; // Last page (0-based)
    const page = await pdfDoc.getPage(pageIndex + 1); // getPage is 1-based
    const viewport = page.getViewport({ scale });

    // Find the page container in DOM
    const pages = document.querySelectorAll('.pdf-page-container');
    const targetPageEl = pages[pageIndex];

    if (!targetPageEl) {
        alert('Page not found in view.');
        return;
    }

    // Default position (center-ish bottom if no keyword found)
    let x = 50;
    let y = viewport.height - 200;

    // Try to find "Signature" keyword
    try {
        const textContent = await page.getTextContent();
        const signatureKeywords = ['Signature', 'Signed', 'Sign Here', 'Employee Signature', 'Learner Signature'];

        let foundItem = null;

        // Simple search
        for (const item of textContent.items) {
            const text = item.str.toLowerCase();
            if (signatureKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
                foundItem = item;
                break; // Stop at first match
            }
        }

        if (foundItem) {
            // item.transform is [scaleX, skewY, skewX, scaleY, tx, ty]
            // PDF coordinates: origin is bottom-left
            const tx = foundItem.transform[4];
            const ty = foundItem.transform[5];

            // Convert to Viewport (DOM) coordinates
            // viewport.convertToViewportPoint(x, y) returns [x, y] in canvas coords (top-left origin)
            const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

            // Position signature to the right of the text
            // vy is the baseline of the text roughly
            // Shift x by the text width + padding
            const itemWidth = foundItem.width || 0;
            // Scale width to viewport
            const scaledWidth = itemWidth * scale;

            x = vx + scaledWidth + 20; // 20px padding
            y = vy - 40; // Move up slightly to align with baseline (approx)
        }
    } catch (e) {
        console.warn('Auto-positioning failed:', e);
    }

    // Create DOM Element
    const sigContainer = document.createElement('div');
    sigContainer.className = 'draggable-signature';

    // Ensure it stays within bounds
    x = Math.max(0, Math.min(x, targetPageEl.offsetWidth - 150));
    y = Math.max(0, Math.min(y, targetPageEl.offsetHeight - 100));

    sigContainer.style.left = `${x}px`;
    sigContainer.style.top = `${y}px`;

    const img = document.createElement('img');
    img.src = dataURL;
    sigContainer.appendChild(img);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-sig-btn';
    deleteBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent drag start
        sigContainer.remove();
    };
    sigContainer.appendChild(deleteBtn);

    targetPageEl.appendChild(sigContainer);
    makeDraggable(sigContainer);

    // Scroll to the signature
    sigContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Simple Drag Logic with Cross-Page Support
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let currentParent = element.parentElement;

    element.addEventListener('mousedown', dragStart);
    // Touch support
    element.addEventListener('touchstart', dragStart, { passive: false });

    function dragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;

        isDragging = true;
        element.classList.add('active');

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        currentParent = element.parentElement;

        if (e.type === 'touchstart') {
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', dragEnd);
        } else {
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault(); // Prevent scrolling on touch

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Check if dragging over a different page
        const elementAtPoint = document.elementFromPoint(clientX, clientY);
        const targetPage = elementAtPoint?.closest('.pdf-page-container');

        if (targetPage && targetPage !== currentParent) {
            // Moving to a different page
            currentParent = targetPage;
            element.parentElement.removeChild(element);
            targetPage.appendChild(element);

            // Reset position relative to new parent
            const targetRect = targetPage.getBoundingClientRect();
            const parentRect = currentParent.getBoundingClientRect();
            
            initialLeft = clientX - targetRect.left - element.offsetWidth / 2;
            initialTop = clientY - targetRect.top - element.offsetHeight / 2;
            startX = clientX;
            startY = clientY;

            newLeft = initialLeft;
            newTop = initialTop;
        }

        // Boundary checks relative to current parent
        const maxLeft = currentParent.offsetWidth - element.offsetWidth;
        const maxTop = currentParent.offsetHeight - element.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
    }

    function dragEnd() {
        isDragging = false;
        element.classList.remove('active');
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
    }
}

// Save PDF
savePdfBtn.addEventListener('click', async () => {
    if (!pdfBytes) return;

    // Show loading state
    const originalText = savePdfBtn.innerHTML;
    savePdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    savePdfBtn.disabled = true;

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Find all signatures in DOM
        const sigElements = document.querySelectorAll('.draggable-signature');

        if (sigElements.length === 0) {
            alert('No signatures added to the document.');
            savePdfBtn.innerHTML = originalText;
            savePdfBtn.disabled = false;
            return;
        }

        for (const sigEl of sigElements) {
            const pageContainer = sigEl.parentElement;
            const pageIndex = parseInt(pageContainer.dataset.pageIndex);
            const img = sigEl.querySelector('img');

            // Get signature image
            const sigImageBytes = await fetch(img.src).then(res => res.arrayBuffer());
            const sigImage = await pdfDoc.embedPng(sigImageBytes);

            // Calculate dimensions and position
            // DOM values
            const domPageWidth = pageContainer.offsetWidth;
            const domPageHeight = pageContainer.offsetHeight;
            const domSigLeft = sigEl.offsetLeft;
            const domSigTop = sigEl.offsetTop;
            const domSigWidth = sigEl.offsetWidth;
            const domSigHeight = sigEl.offsetHeight;

            // PDF values
            const page = pdfDoc.getPages()[pageIndex];
            const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();

            // Scale factors
            const scaleX = pdfPageWidth / domPageWidth;
            const scaleY = pdfPageHeight / domPageHeight;

            // Calculate PDF coordinates
            // PDF coordinate system starts at bottom-left
            // domSigTop is distance from top. 
            // y = height - (top + height)

            const x = domSigLeft * scaleX;
            const y = pdfPageHeight - ((domSigTop + domSigHeight) * scaleY);
            const width = domSigWidth * scaleX;
            const height = domSigHeight * scaleY;

            page.drawImage(sigImage, {
                x,
                y,
                width,
                height,
            });
        }

        const pdfBytesSaved = await pdfDoc.save();
        downloadBlob(pdfBytesSaved, 'signed_document.pdf', 'application/pdf');

    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Error saving PDF: ' + error.message);
    } finally {
        savePdfBtn.innerHTML = originalText;
        savePdfBtn.disabled = false;
    }
});

function downloadBlob(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// Init
initSignaturePad();

