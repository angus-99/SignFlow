# SignFlow - Digital Signature Tool

A modern, user-friendly web application for adding digital signatures to PDF documents. SignFlow allows you to upload PDFs, draw signatures, position them on specific pages, and save the signed documents.

## Features

- **PDF Upload & Display**: Load and view PDF documents with multi-page support
- **Digital Signature Drawing**: Draw signatures using a smooth, responsive canvas
- **Pop-out Signature Pad**: Open signature drawing in a separate window for improved usability
- **Signature Positioning**: Drag and place signatures anywhere on your PDF pages
- **Multi-signature Support**: Add multiple signatures to different pages
- **PDF Export**: Save your signed PDF documents with signatures embedded
- **Responsive Design**: Clean, modern interface that works on various screen sizes
- **Real-time Preview**: See signatures positioned on PDF pages before saving

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No installation or build process required

## Usage

1. **Upload a PDF**: Click the "Upload PDF" button and select a PDF file from your computer
2. **Draw Your Signature**: Use the signature pad on the right panel to draw your signature
3. **Add to Document**: Click "Add to Document" to place the signature on the current PDF page
4. **Position Signature**: Drag the signature to the desired location on the page
5. **Multiple Signatures**: Repeat steps 2-4 to add signatures to different pages
6. **Save**: Click "Save PDF" to download your signed document with all signatures embedded

### Pop-out Signature Pad

For a better signature drawing experience, click the expand icon on the signature card to open a dedicated pop-out window with a larger canvas.

## File Structure

```
SignFlow/
├── index.html          # Main application interface
├── pad.html            # Pop-out signature pad window
├── script.js           # Core application logic
├── style.css           # Styling and layout
└── README.md           # This file
```

## Technologies Used

- **HTML5**: Structure and semantic markup
- **CSS3**: Modern styling and flexbox layout
- **JavaScript (Vanilla)**: Core application logic
- **PDF.js**: PDF rendering and display
- **pdf-lib**: PDF manipulation and signature embedding
- **Signature Pad**: Smooth signature drawing library
- **Font Awesome**: Icon library
- **Google Fonts (Inter)**: Typography

## How It Works

### PDF Rendering
The application uses PDF.js to render PDF pages as canvas elements, allowing for interactive overlays of signature elements.

### Signature Drawing
Signatures are drawn using the Signature Pad library, which provides smooth, pressure-sensitive drawing on HTML5 canvas.

### PDF Modification
Once signatures are positioned, pdf-lib is used to embed them into the original PDF document, creating a new signed version ready for download.

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Key Features Implementation

### Multi-page Support
Navigate through all pages of your PDF document, with the ability to add signatures to any page.

### Draggable Signatures
Signatures are rendered as draggable DOM elements, allowing precise positioning on the document.

### Non-destructive Editing
The original PDF is never modified until you explicitly click "Save PDF", ensuring you can make changes without losing the original.

## Notes

- Signatures are stored in-memory during your session
- All processing happens client-side in your browser (no server upload)
- Supported PDF formats: Standard PDF files (not password-protected)

## Author

Designed by Angus

## License

This project is provided as-is for educational and professional use.

