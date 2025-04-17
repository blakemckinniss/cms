// chat.js - Handles chat UI and message logic

import { sanitize } from './utils.js'; // Import sanitize utility

// Module-scoped variables to hold dependencies
let getCurrentMode = () => 'sms'; // Default function
let getSmsChatDisplay = () => null;
let getEmailChatDisplay = () => null;
let getCopyIconSVG = () => '';
let saveState = () => {}; // Renamed for clarity
let getProjectSelect = () => null; // Need project select for download filename

// SVG for checkmark icon
const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/></svg>`;

/**
 * Configures the chat module with necessary dependencies from main.js.
 * @param {object} config - Configuration object.
 * @param {function} config.getCurrentMode - Function to get the current mode.
 * @param {function} config.getSmsChatDisplay - Function to get the SMS chat display element.
 * @param {function} config.getEmailChatDisplay - Function to get the Email chat display element.
 * @param {function} config.getCopyIconSVG - Function to get the copy icon SVG string.
 * @param {function} config.saveState - Function to trigger saving state to localStorage.
 * @param {function} config.getProjectSelect - Function to get the project select element.
 */
export function configureChat(config) {
    getCurrentMode = config.getCurrentMode || getCurrentMode;
    getSmsChatDisplay = config.getSmsChatDisplay || getSmsChatDisplay;
    getEmailChatDisplay = config.getEmailChatDisplay || getEmailChatDisplay;
    getCopyIconSVG = config.getCopyIconSVG || getCopyIconSVG;
    saveState = config.saveState || saveState;
    getProjectSelect = config.getProjectSelect || getProjectSelect; // Store project select getter
}

export function addWelcomeMessage(displayElement, mode) {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.classList.add('message', 'ai', 'alert', 'alert-info');
    welcomeDiv.setAttribute('role', 'alert');
    welcomeDiv.textContent = `Welcome to ${mode === 'sms' ? 'SMS' : 'Email'} mode! Select a project and type your request below, or use the settings on the right.`;
    displayElement.appendChild(welcomeDiv);
}

/**
 * Adds a message to the appropriate chat display based on the current mode.
 * @param {string} sender - 'user' or 'ai'.
 * @param {string|object|array} content - The message content.
 * @param {boolean} [returnElement=false] - If true, returns the created message element.
 * @returns {HTMLElement|undefined} The created message element if returnElement is true.
 */
export function addMessageToChat(sender, content, returnElement = false) {
    const mode = getCurrentMode(); // Use the function passed during configuration
    const targetChatDisplay = mode === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();

    if (!targetChatDisplay) {
        console.error(`addMessageToChat failed: chatDisplay element for mode '${mode}' not found!`);
        alert("Critical Error: Chat display area is missing. Please reload the page.");
        return undefined; // Return undefined if display not found
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    if (sender === 'ai') {
        // Determine class based on content (simple check for "Error:" prefix)
        const isErrorMessage = typeof content === 'string' && content.startsWith('Error:');
        messageDiv.classList.add('alert', isErrorMessage ? 'alert-danger' : 'alert-info');
        messageDiv.setAttribute('role', 'alert');

        let displayContentHTML = '';
        let rawTextForCopy = '';

        // Use imported sanitize function

        const formatEmailItem = (item, index = null) => {
            const subject = item.subject ? sanitize(item.subject) : '(No Subject Provided)';
            // For message, create a <pre> element and set its textContent
            const messagePre = document.createElement('pre');
            messagePre.className = 'email-body';
            messagePre.textContent = item.message || '(No Message Provided)'; // Set raw text here

            const variationLabel = index !== null ? `<strong>Variation ${index + 1}:</strong><br>` : '';
            return `${variationLabel}<strong>Subject:</strong> ${subject}<br><hr class='my-1'><strong>Message:</strong><br>${messagePre.outerHTML}`; // Use outerHTML of the pre tag
        };

        const formatRawTextItem = (item, index = null) => {
            const subject = item.subject || '(No Subject Provided)';
            const message = item.message || '(No Message Provided)';
            const variationLabel = index !== null ? `Variation ${index + 1}:\n` : '';
            return `${variationLabel}Subject: ${subject}\nMessage:\n${message}`;
        };

        if (Array.isArray(content)) { // Handle array of email results
            displayContentHTML = content.map((item, index) => `<div class='email-variation'>${formatEmailItem(item, index)}</div>`).join("<hr class='my-2'>");
            rawTextForCopy = content.map((item, index) => formatRawTextItem(item, index)).join('\n\n---\n\n');
        } else if (typeof content === 'object' && content !== null && (content.subject || content.message)) { // Handle single email result
            displayContentHTML = formatEmailItem(content);
            rawTextForCopy = formatRawTextItem(content);
        } else { // Handle plain text (SMS or error message)
            const text = typeof content === 'string' ? content : JSON.stringify(content);
            displayContentHTML = sanitize(text); // Sanitize plain text
            rawTextForCopy = text;
        }

        messageDiv.innerHTML = displayContentHTML; // Set potentially complex HTML
        messageDiv.dataset.rawText = rawTextForCopy; // Store original structure for copy

        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.classList.add('btn', 'btn-sm', 'copy-msg-btn');
        copyButton.title = 'Copy message';
        copyButton.innerHTML = getCopyIconSVG(); // Use the function passed during configuration
        messageDiv.appendChild(copyButton);

    } else { // user message
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        messageDiv.textContent = text; // Use textContent for user messages for safety
        messageDiv.dataset.rawText = text;
    }

    targetChatDisplay.insertAdjacentElement('beforeend', messageDiv);
    targetChatDisplay.scrollTop = targetChatDisplay.scrollHeight;
    // Save state AFTER adding message
    saveState(); // Use the function passed during configuration

    if (returnElement) {
        return messageDiv; // Return the element if requested
    }
}

/**
 * Handles clicks on copy buttons within chat messages.
 * @param {Event} event - The click event.
 */
function handleCopyMessageClick(event) {
    const copyButton = event.target.closest('.copy-msg-btn');
    if (!copyButton) return;

    const messageDiv = copyButton.closest('.message.ai');
    if (!messageDiv || !messageDiv.dataset.rawText) {
        console.error("Could not find message text to copy.");
        return;
    }

    const textToCopy = messageDiv.dataset.rawText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyButton.innerHTML = checkIconSVG; // Use checkmark SVG
        copyButton.classList.add('copied');
        copyButton.disabled = true;
        copyButton.title = 'Copied!';
        setTimeout(() => {
            copyButton.innerHTML = getCopyIconSVG(); // Restore original icon
            copyButton.classList.remove('copied');
            copyButton.disabled = false;
            copyButton.title = 'Copy message';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        copyButton.title = 'Copy failed!';
        // Optionally provide feedback to the user in the UI
        setTimeout(() => { copyButton.title = 'Copy message'; }, 2000);
    });
}

/**
 * Clears the chat history for the specified mode.
 * @param {string} modeToClear - 'sms' or 'email'.
 */
export function clearHistory(modeToClear) {
    const chatDisplayToClear = modeToClear === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();

    if (!chatDisplayToClear) {
        console.error(`Cannot clear history: Chat display for mode '${modeToClear}' not found.`);
        return;
    }

    chatDisplayToClear.innerHTML = ''; // Clear the display
    addWelcomeMessage(chatDisplayToClear, modeToClear); // Add welcome message back
    console.log(`Chat history cleared for ${modeToClear} mode.`);
    // Note: Saving state is handled by the caller in main.js after calling this
}

/**
 * Downloads the AI-generated messages from the specified mode's chat history.
 * @param {string} modeToDownload - 'sms' or 'email'.
 */
export function downloadAiHistory(modeToDownload) {
    const chatDisplayToDownload = modeToDownload === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();
    const projectSelect = getProjectSelect(); // Get project select element

    if (!chatDisplayToDownload || !projectSelect) {
        console.error(`Cannot download history: Chat display or project select for mode '${modeToDownload}' not found.`);
        addMessageToChat('ai', `Error: Could not prepare download for ${modeToDownload.toUpperCase()} mode.`);
        return;
    }

    // Select only AI messages that are not informational alerts
    const messages = chatDisplayToDownload.querySelectorAll('.message.ai:not(.alert-info):not(.alert-danger)');

    if (messages.length === 0) {
        addMessageToChat('ai', `Info: No AI messages to download for ${modeToDownload.toUpperCase()} mode.`);
        return;
    }

    const projectName = projectSelect.value || 'UnknownProject';
    let content = `AI Generated Content - ${projectName} (${modeToDownload.toUpperCase()}) - ${new Date().toLocaleString()}\n\n`;
    content += "========================================\n\n";

    messages.forEach((msg, index) => {
        const rawText = msg.dataset.rawText || msg.innerText || msg.textContent; // Fallback chain
        content += `----- Result ${index + 1} -----\n`;
        content += rawText.trim(); // Use the stored raw text
        content += "\n\n========================================\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = `ai_content_${projectName}_${modeToDownload}_${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    console.log(`AI history downloaded for ${modeToDownload} mode.`);
}

/**
 * Initializes chat-related event listeners, like the copy button handler.
 */
export function initializeChat() {
    // Use event delegation on a parent container for copy buttons
    const mainContentContainer = document.querySelector('.main-content-container');
    if (mainContentContainer) {
        mainContentContainer.addEventListener('click', handleCopyMessageClick);
    } else {
        console.error("Chat Initialization Error: Could not find main content container '.main-content-container' to attach copy listener.");
        // Attempt to attach to body as a fallback, though less specific
        document.body.addEventListener('click', handleCopyMessageClick);
    }
    console.log("Chat module initialized.");
}