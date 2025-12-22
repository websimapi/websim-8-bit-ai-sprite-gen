/**
 * Core Logic for the 8-Bit Generator
 * Handles image downsampling, palette reduction, and outlining.
 */

export class PixelProcessor {
    constructor() {
        // Offscreen canvas for processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Main processing pipeline
     */
    async process(imageSource, size, isTransparent) {
        // 1. Resize/Downsample
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Disable smoothing to keep it crisp during draw
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(imageSource, 0, 0, size, size);

        // 2. Get Raw Pixel Data
        let imageData = this.ctx.getImageData(0, 0, size, size);
        let data = imageData.data;

        // 3. Clean Alpha & Background Removal (if transparent)
        // Even with transparent=true from AI, we might get semi-transparent pixels.
        // We need hard edges for 8-bit.
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Simple threshold for alpha to make it binary
            if (isTransparent) {
                // If it's mostly transparent, kill it
                if (a < 128) {
                    data[i + 3] = 0;
                } else {
                    data[i + 3] = 255;
                }
            } else {
                data[i + 3] = 255; // Force opaque if toggle is off
            }
        }

        // 4. Color Quantization (Reduce bit depth)
        // Reduce colors to simulated 8-bit (e.g., 4-5 bits per channel)
        const levels = 6; // Lower number = more "retro" banding
        const step = 255 / (levels - 1);
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i+3] === 0) continue; // Skip transparent

            data[i] = Math.round(data[i] / step) * step;     // R
            data[i+1] = Math.round(data[i+1] / step) * step; // G
            data[i+2] = Math.round(data[i+2] / step) * step; // B
        }

        // Put clean data back for outlining step
        this.ctx.putImageData(imageData, 0, 0);

        // 5. Apply Outline Algorithm
        if (isTransparent) {
            imageData = this.applyOutline(imageData, size);
        }

        return imageData;
    }

    /**
     * Algorithms to add a 1px black border around non-transparent pixels
     */
    applyOutline(imageData, size) {
        const width = size;
        const height = size;
        const inputData = imageData.data;
        
        // Create a new buffer for the output so we don't read modified pixels
        const outputImageData = new ImageData(width, height);
        const outputData = outputImageData.data;

        // Copy input to output first
        outputData.set(inputData);

        const getPixel = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            const index = (y * width + x) * 4;
            return inputData[index + 3]; // Return alpha
        };

        const setBlack = (x, y) => {
            const index = (y * width + x) * 4;
            outputData[index] = 0;     // R
            outputData[index + 1] = 0; // G
            outputData[index + 2] = 0; // B
            outputData[index + 3] = 255; // Alpha
        };

        // Scan every pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = inputData[(y * width + x) * 4 + 3];

                // If this pixel is transparent
                if (alpha === 0) {
                    // Check 4 neighbors (Up, Down, Left, Right)
                    // If any neighbor is opaque, this pixel becomes an outline
                    if (getPixel(x + 1, y) > 0 ||
                        getPixel(x - 1, y) > 0 ||
                        getPixel(x, y + 1) > 0 ||
                        getPixel(x, y - 1) > 0) {
                        setBlack(x, y);
                    }
                }
            }
        }

        return outputImageData;
    }

    /**
     * Helper to load an image from URL
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}

