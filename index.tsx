/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, GeneratedImage, PersonGeneration} from '@google/genai';

// Use process.env.API_KEY as per the guidelines
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// --- DOM Elements ---
const promptForm = document.getElementById('prompt-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const chatContainer = document.getElementById('chat-container');
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement;
const closeLightboxBtn = document.getElementById('close-lightbox');
const downloadLink = document.getElementById('download-link') as HTMLAnchorElement;

// --- Model Selection ---
const selectedModel = 'imagen-4.0-generate-001';

/**
 * Scrolls the chat container to the bottom.
 */
function scrollToBottom() {
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

/**
 * Appends a user's message to the chat.
 * @param {string} prompt The text of the user's prompt.
 */
function appendUserMessage(prompt: string) {
    if (!chatContainer) return;
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = prompt;
    
    userMessageDiv.appendChild(contentDiv);
    chatContainer.appendChild(userMessageDiv);
    scrollToBottom();
}

/**
 * Appends a placeholder for the AI's response with a loading indicator.
 * @returns {HTMLDivElement} The content container for the AI's message.
 */
function appendAiMessagePlaceholder(): HTMLDivElement | null {
    if (!chatContainer) return null;

    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'chat-message ai-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = `
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
    `;
    
    contentDiv.appendChild(loaderContainer);
    aiMessageDiv.appendChild(contentDiv);
    chatContainer.appendChild(aiMessageDiv);
    scrollToBottom();

    return contentDiv; // Return the inner div where content will be placed
}

/**
 * Generates images and populates the AI message container with the results.
 * @param {string} prompt The text prompt for image generation.
 * @param {HTMLDivElement} aiMessageContentDiv The content container of the AI's message.
 */
async function generateAndDisplayImages(prompt: string, aiMessageContentDiv: HTMLDivElement) {
  // 1. Set loading state
  promptInput.disabled = true;
  generateBtn.disabled = true;

  try {
    // 2. Call the API
    const response = await ai.models.generateImages({
      model: selectedModel,
      prompt: prompt,
      config: {
        numberOfImages: 3,
        aspectRatio: '1:1',
        personGeneration: PersonGeneration.ALLOW_ADULT,
        outputMimeType: 'image/jpeg',
        includeRaiReason: true,
      },
    });

    // 3. Display the results
    aiMessageContentDiv.innerHTML = ''; // Clear loader

    if (response?.generatedImages && response.generatedImages.length > 0) {
        const imageGrid = document.createElement('div');
        imageGrid.className = 'image-grid';

        response.generatedImages.forEach((generatedImage: GeneratedImage) => {
            if (generatedImage.image?.imageBytes) {
            const src = `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
            const img = new Image();
            img.src = src;
            img.alt = prompt;
            imageGrid.appendChild(img);
            }
        });
        aiMessageContentDiv.appendChild(imageGrid);

    } else {
        aiMessageContentDiv.innerHTML = `<p class="error-message">No images were generated. Please try a different prompt.</p>`;
    }

  } catch (error) {
    console.error("Error generating images or processing response:", error);
    aiMessageContentDiv.innerHTML = `<p class="error-message">Error: Could not load images. Check the console for details.</p>`;
  } finally {
    // 4. Reset UI state
    promptInput.disabled = false;
    generateBtn.disabled = false;
    promptInput.focus();
    scrollToBottom();
  }
}

/**
 * Opens the lightbox with the clicked image.
 * @param {HTMLImageElement} imageElement The image element that was clicked.
 */
function openLightbox(imageElement: HTMLImageElement) {
    if (!lightboxOverlay || !lightboxImage || !downloadLink) return;

    const src = imageElement.src;
    const alt = imageElement.alt;
    // Create a safe filename from the prompt
    const safeFilename = alt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

    lightboxImage.src = src;
    lightboxImage.alt = alt;
    downloadLink.href = src;
    downloadLink.download = `${safeFilename || 'gemini-generated'}.jpeg`;
    lightboxOverlay.classList.add('visible');
}

/**
 * Closes the lightbox.
 */
function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.remove('visible');
}


// --- Event Listener ---
if (promptForm) {
  promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt || promptInput.disabled) return;

    appendUserMessage(prompt);
    const aiMessageContent = appendAiMessagePlaceholder();
    
    if (aiMessageContent) {
        generateAndDisplayImages(prompt, aiMessageContent);
    }
    
    promptInput.value = '';
  });
} else {
    console.error('Prompt form not found!');
}

// Event listener for opening the lightbox (using event delegation on the chat container)
chatContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Check if the clicked element is an image inside our grid
    if (target.tagName === 'IMG' && target.parentElement?.classList.contains('image-grid')) {
        openLightbox(target as HTMLImageElement);
    }
});

// Event listeners for closing the lightbox
closeLightboxBtn?.addEventListener('click', closeLightbox);

lightboxOverlay?.addEventListener('click', (e) => {
    // Close only if the dark background overlay itself is clicked, not the content inside
    if (e.target === lightboxOverlay) {
        closeLightbox();
    }
});

document.addEventListener('keydown', (e) => {
    // Close on 'Escape' key press if lightbox is visible
    if (e.key === 'Escape' && lightboxOverlay?.classList.contains('visible')) {
        closeLightbox();
    }
});