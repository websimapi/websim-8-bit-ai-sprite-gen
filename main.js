import { PixelProcessor } from './pixel-processor.js';

// Elements
const canvas = document.getElementById('displayCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const promptInput = document.getElementById('promptInput');
const sizeSelect = document.getElementById('sizeSelect');
const transparentToggle = document.getElementById('transparentToggle');
const loader = document.getElementById('loader');
const statusText = document.getElementById('statusText');

// Processor
const processor = new PixelProcessor();

// State
let currentResultUrl = null;

// Initialize Canvas
function initCanvas() {
    // Default visual size
    canvas.width = 512;
    canvas.height = 512;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw placeholder text
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('READY', canvas.width/2, canvas.height/2);
}

// Logic
async function handleGenerate() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // UI Updates
    generateBtn.disabled = true;
    loader.classList.remove('hidden');
    statusText.innerText = "DREAMING UP\nPIXELS...";
    downloadBtn.disabled = true;

    try {
        const size = parseInt(sizeSelect.value);
        const isTransparent = transparentToggle.checked;

        // 1. Generate High Res Image using AI
        // We ask for a flat, simple style to help the downsampling algorithm
        const aiPrompt = `Pixel art sprite of ${prompt}, full body, flat colors, simple shading, white background, high contrast, video game asset`;
        
        statusText.innerText = "SUMMONING\nAI ARTIST...";
        
        const result = await websim.imageGen({
            prompt: aiPrompt,
            aspect_ratio: "1:1",
            transparent: isTransparent 
        });

        statusText.innerText = "QUANTIZING\n& OUTLINING...";

        // 2. Load the generated image
        const img = await processor.loadImage(result.url);

        // 3. Process the image (Downsample -> Outline)
        const processedData = await processor.process(img, size, isTransparent);

        // 4. Render to Display Canvas
        // We render the tiny pixel data onto the large canvas with nearest-neighbor scaling
        canvas.width = size;
        canvas.height = size;
        ctx.putImageData(processedData, 0, 0);

        // Store result for download
        currentResultUrl = canvas.toDataURL('image/png');
        
        downloadBtn.disabled = false;

    } catch (err) {
        console.error(err);
        statusText.innerText = "ERROR\nSYSTEM FAIL";
        setTimeout(() => loader.classList.add('hidden'), 2000);
        return;
    }

    // Hide loader
    loader.classList.add('hidden');
    generateBtn.disabled = false;
}

function handleDownload() {
    if (!currentResultUrl) return;
    
    const link = document.createElement('a');
    link.download = `8bit-sprite-${Date.now()}.png`;
    link.href = currentResultUrl;
    link.click();
}

// Event Listeners
generateBtn.addEventListener('click', handleGenerate);
downloadBtn.addEventListener('click', handleDownload);
promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGenerate();
});

// Start
initCanvas();

