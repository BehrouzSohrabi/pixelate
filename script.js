const imageInput = document.getElementById('imageInput');
const fileNameSpan = document.getElementById('fileName');
const convertBtn = document.getElementById('convertBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessageSpan = document.getElementById('errorMessage');
const resultImage = document.getElementById('resultImage');
const originalImage = document.getElementById('originalImage');
const blockSizeInfo = document.getElementById('blockSizeInfo');
const originalSizeInfo = document.getElementById('originalSizeInfo');
const resultSizeInfo = document.getElementById('resultSizeInfo');
const paddingInfo = document.getElementById('paddingInfo');
const downloadBtn = document.getElementById('downloadBtn');
const controlPanel = document.getElementById('controlPanel');
const panelToggle = document.getElementById('panelToggle');
const emptyState = document.getElementById('emptyState');
const gutter = document.getElementById('gutter');
const resultPane = document.getElementById('resultPane');
const originalPane = document.getElementById('originalPane');
const previewImage = document.getElementById('previewImage');

// Manual input controls
const autoDetectRadio = document.getElementById('autoDetect');
const manualInputRadio = document.getElementById('manualInput');
const manualBlockSizeInput = document.getElementById('manualBlockSize');
const xPaddingInput = document.getElementById('xPadding');
const yPaddingInput = document.getElementById('yPadding');
const manualInputsDiv = document.getElementById('manualInputs');

let selectedFile = null;
let isResizing = false;

// Resizable splitter functionality
gutter.addEventListener('mousedown', (e) => {
    isResizing = true;
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const container = document.querySelector('.split-view-container');
    const containerRect = container.getBoundingClientRect();

    // Calculate position as percentage of container width
    const position = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Ensure minimum pane sizes (20%)
    if (position < 20 || position > 80) return;

    resultPane.style.flex = `${position}`;
    originalPane.style.flex = `${100 - position}`;
});

document.addEventListener('mouseup', () => {
    isResizing = false;
});

// Enable/disable manual inputs based on radio selection
panelToggle.addEventListener('click', () => {
    console.log("Panel toggle clicked");
    controlPanel.classList.toggle('collapsed');
});

autoDetectRadio.addEventListener('change', () => {
    manualBlockSizeInput.disabled = true;
    xPaddingInput.disabled = true;
    yPaddingInput.disabled = true;
});

manualInputRadio.addEventListener('change', () => {
    manualBlockSizeInput.disabled = false;
    xPaddingInput.disabled = false;
    yPaddingInput.disabled = false;
});

function handleImageSelection(file) {
    selectedFile = file;
    
    if (selectedFile) {
        fileNameSpan.textContent = selectedFile.name || 'Pasted image';
        convertBtn.disabled = false;
        
        // Reset UI
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
        resultImage.src = '#';
        downloadBtn.href = '#';
        
        // Display preview image
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image">`;
        };
        reader.readAsDataURL(selectedFile);
    } else {
        fileNameSpan.textContent = 'No file chosen';
        convertBtn.disabled = true;
        previewImage.innerHTML = '';
    }
}

// Handle file input changes
imageInput.addEventListener('change', (event) => {
    handleImageSelection(event.target.files[0]);
});

// Handle paste events
document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            handleImageSelection(item.getAsFile());
            break;
        }
    }
});

document.body.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
});
document.body.addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
});
document.body.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type.indexOf('image') === 0) {
            handleImageSelection(file);
        }
    }
});

convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    loadingIndicator.style.display = 'flex';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    convertBtn.disabled = true;
    imageInput.disabled = true; // Prevent changing file during processing

    try {
        const fileType = selectedFile.type;
        const reader = new FileReader();

        reader.onload = async (e) => {
            const dataUrl = e.target.result;

            if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(fileType)) {
                const img = new Image();
                img.onload = async () => {
                    // Get settings for block size and padding
                    const useAutoDetect = autoDetectRadio.checked;
                    const manualBlockSize = parseInt(manualBlockSizeInput.value) || 8;
                    const xPadding = parseInt(xPaddingInput.value) || 0;
                    const yPadding = parseInt(yPaddingInput.value) || 0;

                    await processStaticImage(img, fileType, useAutoDetect, manualBlockSize, xPadding, yPadding);
                };
                img.onerror = () => {
                    showError("Failed to load image.");
                };
                img.src = dataUrl;
            } else {
                showError(`Unsupported file type: ${fileType}`);
            }
        };

        reader.onerror = () => {
            showError("Failed to read file.");
        };

        reader.readAsDataURL(selectedFile); // For static images and initial GIF load

    } catch (error) {
        console.error("Conversion Error:", error);
        showError(error.message || "An unexpected error occurred during conversion.");
    } finally {
        // Re-enable controls unless an error occurred and hid the loader already
        if (loadingIndicator.style.display !== 'none') {
            loadingIndicator.style.display = 'none';
            convertBtn.disabled = false;
            imageInput.disabled = false;
        }
    }
});

function showError(message) {
    errorMessageSpan.textContent = message;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
    loadingIndicator.style.display = 'none';
    convertBtn.disabled = false; // Re-enable button on error
    imageInput.disabled = false;
}

/**
 * Detects the block size of an upscaled pixel art image by analyzing
 * runs of uniform colors across rows and columns.
 * 
 * @param {ImageData} imageData - The ImageData object from a canvas.
 * @param {number} [colorTolerance=5] - Tolerance for color comparison (0-255).
 * @param {number} [sampleRate=0.2] - Proportion of rows/columns to sample (0-1).
 * @returns {number} The detected block size, or 1 if no clear pattern found.
 */
function detectBlockSize(imageData, colorTolerance = 50, sampleRate = 0.2) {
    const { width, height, data } = imageData;

    // Guard against tiny images
    if (width < 2 || height < 2) return 1;

    // Helper: Get pixel color at (x,y)
    const getPixel = (x, y) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    // Helper: Compare colors with tolerance
    const colorsEqual = (c1, c2) => {
        // Both transparent case
        if (c1[3] === 0 && c2[3] === 0) return true;
        // One transparent, one not
        if ((c1[3] === 0 && c2[3] !== 0) || (c1[3] !== 0 && c2[3] === 0)) return false;

        // Compare RGB values with tolerance
        return Math.abs(c1[0] - c2[0]) <= colorTolerance &&
            Math.abs(c1[1] - c2[1]) <= colorTolerance &&
            Math.abs(c1[2] - c2[2]) <= colorTolerance;
    };

    // Maps to track run lengths
    const horizontalRuns = new Map();
    const verticalRuns = new Map();

    // Analyze horizontal runs
    const rowStep = Math.max(1, Math.floor(1 / sampleRate));
    for (let y = 0; y < height; y += rowStep) {
        let currentRun = 1;
        let lastColor = getPixel(0, y);

        for (let x = 1; x < width; x++) {
            const color = getPixel(x, y);

            if (colorsEqual(lastColor, color)) {
                // Same color, increase run length
                currentRun++;
            } else {
                // Color changed, record run length if > 1
                if (currentRun > 1) {
                    horizontalRuns.set(currentRun, (horizontalRuns.get(currentRun) || 0) + 1);
                }
                currentRun = 1;
                lastColor = color;
            }
        }

        // Don't forget to record the last run
        if (currentRun > 1) {
            horizontalRuns.set(currentRun, (horizontalRuns.get(currentRun) || 0) + 1);
        }
    }

    // Analyze vertical runs
    const colStep = Math.max(1, Math.floor(1 / sampleRate));
    for (let x = 0; x < width; x += colStep) {
        let currentRun = 1;
        let lastColor = getPixel(x, 0);

        for (let y = 1; y < height; y++) {
            const color = getPixel(x, y);

            if (colorsEqual(lastColor, color)) {
                // Same color, increase run length
                currentRun++;
            } else {
                // Color changed, record run length if > 1
                if (currentRun > 1) {
                    verticalRuns.set(currentRun, (verticalRuns.get(currentRun) || 0) + 1);
                }
                currentRun = 1;
                lastColor = color;
            }
        }

        // Don't forget to record the last run
        if (currentRun > 1) {
            verticalRuns.set(currentRun, (verticalRuns.get(currentRun) || 0) + 1);
        }
    }

    // Combine horizontal and vertical runs
    const combinedRuns = new Map();

    // Add horizontal runs to combined
    for (const [length, count] of horizontalRuns.entries()) {
        combinedRuns.set(length, (combinedRuns.get(length) || 0) + count);
    }

    // Add vertical runs to combined
    for (const [length, count] of verticalRuns.entries()) {
        combinedRuns.set(length, (combinedRuns.get(length) || 0) + count);
    }

    // If no runs found, return 1
    if (combinedRuns.size === 0) return 1;

    // Sort run lengths by frequency (highest first)
    const sortedRuns = Array.from(combinedRuns.entries())
        .sort((a, b) => b[1] - a[1]);

    console.log("Run lengths by frequency:", sortedRuns);

    // If no suitable run length found that matches dimensions, return the most frequent one
    // as a fallback, or 1 if there are no valid candidates
    return sortedRuns.length > 0 && sortedRuns[0][0] > 1 ? sortedRuns[0][0] : 1;
}

async function processStaticImage(img, fileType, useAutoDetect, manualBlockSize, xPadding, yPadding) {
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = img.naturalWidth;
    sourceCanvas.height = img.naturalHeight;
    sourceCtx.drawImage(img, 0, 0);

    let imageData;
    try {
        imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    } catch (e) {
        // Handle potential SecurityError if image is cross-origin and server lacks CORS
        showError("Could not get image data. If loading from another website, check CORS policy.");
        return;
    }

    // Determine block size - either auto-detect or use manual input
    let blockSize;
    if (useAutoDetect) {
        blockSize = detectBlockSize(imageData);
        if (blockSize <= 1) {
            console.log("Block size detected as 1x1. Proceeding with direct resampling (may not be intended result).");
        }
    } else {
        blockSize = manualBlockSize;
    }

    // Calculate output dimensions based on block size and image size
    // Account for padding in calculations
    const effectiveWidth = sourceCanvas.width - xPadding;
    const effectiveHeight = sourceCanvas.height - yPadding;
    const outWidth = Math.floor(effectiveWidth / blockSize);
    const outHeight = Math.floor(effectiveHeight / blockSize);

    if (outWidth <= 0 || outHeight <= 0) {
        showError(`Resulting image dimensions (${outWidth}x${outHeight}) are too small. Check block size and padding values.`);
        return;
    }

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = outWidth;
    resultCanvas.height = outHeight;
    const resultCtx = resultCanvas.getContext('2d');

    // Disable image smoothing for crisp pixels on the result canvas
    resultCtx.imageSmoothingEnabled = false;

    // --- Pixel Conversion Logic ---
    const sourceData = imageData.data;
    const resultImageData = resultCtx.createImageData(outWidth, outHeight);
    const resultData = resultImageData.data;

    for (let y = 0; y < outHeight; y++) {
        for (let x = 0; x < outWidth; x++) {
            // Calculate the corresponding block in the source image
            // Add padding offsets to the starting position
            const srcBlockStartX = xPadding + (x * blockSize);
            const srcBlockStartY = yPadding + (y * blockSize);

            // Variables to accumulate color values
            let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
            let pixelCount = 0;

            // Iterate through all pixels in the block
            for (let blockY = 0; blockY < blockSize; blockY++) {
                for (let blockX = 0; blockX < blockSize; blockX++) {
                    const srcX = srcBlockStartX + blockX;
                    const srcY = srcBlockStartY + blockY;

                    // Skip if outside source bounds
                    if (srcX >= sourceCanvas.width || srcY >= sourceCanvas.height) continue;

                    const srcIndex = (srcY * sourceCanvas.width + srcX) * 4;
                    sumR += sourceData[srcIndex];
                    sumG += sourceData[srcIndex + 1];
                    sumB += sourceData[srcIndex + 2];
                    sumA += sourceData[srcIndex + 3];
                    pixelCount++;
                }
            }

            // Calculate average color for the block
            const avgR = Math.round(sumR / pixelCount);
            const avgG = Math.round(sumG / pixelCount);
            const avgB = Math.round(sumB / pixelCount);
            const avgA = Math.round(sumA / pixelCount);

            // Put the averaged color onto the result image data
            const resIndex = (y * outWidth + x) * 4;
            resultData[resIndex] = avgR;
            resultData[resIndex + 1] = avgG;
            resultData[resIndex + 2] = avgB;
            resultData[resIndex + 3] = avgA;
        }
    }
    resultCtx.putImageData(resultImageData, 0, 0);
    // --- End Pixel Conversion ---

    // Display results
    emptyState.style.display = 'none';

    const resultDataUrl = resultCanvas.toDataURL('image/png');
    resultImage.src = resultDataUrl;
    resultImage.style.display = 'block';
    resultImage.style.width = `${img.naturalWidth}px`;

    const originalDataUrl = img.src;
    originalImage.src = originalDataUrl;
    originalImage.style.display = 'block';
    originalImage.style.width = `${img.naturalWidth}px`;

    blockSizeInfo.textContent = `${blockSize} x ${blockSize}`;
    originalSizeInfo.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
    resultSizeInfo.textContent = `${outWidth} x ${outHeight}`;
    paddingInfo.textContent = `X: ${xPadding}, Y: ${yPadding}`;

    // Setup download link
    const downloadFileName = `pixel-art-result-${outWidth}x${outHeight}.png`;
    downloadBtn.href = resultDataUrl;
    downloadBtn.download = downloadFileName;

    resultSection.style.display = 'flex';
    loadingIndicator.style.display = 'none';
    convertBtn.disabled = false;
    imageInput.disabled = false;
}