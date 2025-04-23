// chat.js - Handles chat UI and message logic

import { sanitize } from './utils.js'; // Import sanitize utility
import { enhancePrompt, generatePrompt } from './api.js'; // Import NEW API functions

// Module-scoped variables to hold dependencies
let getCurrentMode = () => 'sms'; // Default function
let getSmsChatDisplay = () => null;
let getEmailChatDisplay = () => null;
let getCopyIconSVG = () => '';
let saveState = () => {}; // Renamed for clarity
let getProjectSelect = () => null; // Need project select for download filename
let getSmsMessageHistoryButton = () => null; // Add getter for the new button
let getEmailMessageHistoryButton = () => null; // Add getter for the new button
let getSmsUserInput = () => null; // Getter for SMS input textarea
let getEmailUserInput = () => null; // Getter for Email input textarea
let getTopicInput = () => null; // Getter for Topic setting input
let getToneInput = () => null; // Getter for Tone setting input
let getSmsEnhanceButton = () => null; // Getter for SMS Enhance button
let getSmsGenerateButton = () => null; // Getter for SMS Generate button
let getEmailEnhanceButton = () => null; // Getter for Email Enhance button
let getEmailGenerateButton = () => null; // Getter for Email Generate button


const MAX_HISTORY_MESSAGES = 20; // Define max messages to store

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
 * @param {function} config.getSmsUserInput - Function to get the SMS user input element.
 * @param {function} config.getEmailUserInput - Function to get the Email user input element.
 * @param {function} config.getTopicInput - Function to get the Topic input element.
 * @param {function} config.getToneInput - Function to get the Tone input element.
 * @param {function} config.getSmsEnhanceButton - Function to get the SMS Enhance button element.
 * @param {function} config.getSmsGenerateButton - Function to get the SMS Generate button element.
 * @param {function} config.getEmailEnhanceButton - Function to get the Email Enhance button element.
 * @param {function} config.getEmailGenerateButton - Function to get the Email Generate button element.
 */
export function configureChat(config) {
    getCurrentMode = config.getCurrentMode || getCurrentMode;
    getSmsChatDisplay = config.getSmsChatDisplay || getSmsChatDisplay;
    getEmailChatDisplay = config.getEmailChatDisplay || getEmailChatDisplay;
    getCopyIconSVG = config.getCopyIconSVG || getCopyIconSVG;
    saveState = config.saveState || saveState;
    getProjectSelect = config.getProjectSelect || getProjectSelect; // Store project select getter
    getSmsMessageHistoryButton = config.getSmsMessageHistoryButton || getSmsMessageHistoryButton; // Assign new getter
    getEmailMessageHistoryButton = config.getEmailMessageHistoryButton || getEmailMessageHistoryButton; // Assign new getter
    // Assign new getters for prompt enhancement/generation
    getSmsUserInput = config.getSmsUserInput || getSmsUserInput;
    getEmailUserInput = config.getEmailUserInput || getEmailUserInput;
    getTopicInput = config.getTopicInput || getTopicInput;
    getToneInput = config.getToneInput || getToneInput;
    getSmsEnhanceButton = config.getSmsEnhanceButton || getSmsEnhanceButton;
    getSmsGenerateButton = config.getSmsGenerateButton || getSmsGenerateButton;
    getEmailEnhanceButton = config.getEmailEnhanceButton || getEmailEnhanceButton;
    getEmailGenerateButton = config.getEmailGenerateButton || getEmailGenerateButton;
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
 * @param {string} sender - 'user', 'ai', or 'request-summary'.
 * @param {string|object|array} content - The message content.
 * @param {boolean} [returnElement=false] - If true, returns the created message element.
 * @param {object} [options] - Optional options object.
 * @param {boolean} [options.asHtml] - If true, treat content as raw HTML (for AI messages only).
 * @param {boolean} [options.insertBeforeSpinner] - If true, insert before spinner if present (for streaming SMS).
 * @returns {HTMLElement|undefined} The created message element if returnElement is true.
 */
/**
 * Adds a message to the appropriate chat display based on the current mode.
 * @param {string} sender - 'user', 'ai', or 'request-summary'.
 * @param {string|object|array} content - The message content.
 * @param {boolean} [returnElement=false] - If true, returns the created message element.
 * @param {object} [options] - Optional options object.
 * @param {boolean} [options.asHtml] - If true, treat content as raw HTML (for AI messages only).
 * @param {boolean} [options.insertBeforeSpinner] - If true, insert before spinner if present (for streaming SMS).
 * @returns {HTMLElement|undefined} The created message element if returnElement is true.
 */
export function addMessageToChat(sender, content, returnElement = false, options = {}) {
    const mode = getCurrentMode(); // Use the function passed during configuration
    const targetChatDisplay = mode === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();

    if (!targetChatDisplay) {
        console.error(`addMessageToChat failed: chatDisplay element for mode '${mode}' not found!`);
        alert("Critical Error: Chat display area is missing. Please reload the page.");
        return undefined; // Return undefined if display not found
    }
    // --- Timestamp Generation ---
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('message-timestamp');
    const now = new Date();
    const dateOptions = { month: 'numeric', day: 'numeric', year: 'numeric' };
    // Use timeZoneName: 'short' - might give EDT/EST etc. depending on date/locale
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' };
    const datePart = now.toLocaleDateString('en-US', dateOptions);
    const timePart = now.toLocaleTimeString('en-US', timeOptions);
    const formattedTimestamp = `${datePart} ${timePart}`;
    // --- End Timestamp Generation ---


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

        // --- Refactored Email Formatting Logic ---
        const formatEmailItemForDisplay = (item, index = null) => {
            const subject = item.subject ? sanitize(item.subject) : '(No Subject Provided)';
            const message = item.message || '(No Message Provided)';
            const variationLabel = index !== null ? `Variation ${index + 1}` : 'Email Result';

            // Use Bootstrap Card structure
            return `
                <div class="card email-variation mb-3">
                    <div class="card-header bg-light py-2">
                        <strong class="me-2">${variationLabel}:</strong> ${subject}
                    </div>
                    <div class="card-body py-2">
                        <pre class="email-body mb-0">${sanitize(message)}</pre>
                    </div>
                </div>
            `;
        };

        const formatEmailItemForCopy = (item, index = null) => {
            const subject = item.subject || '(No Subject Provided)';
            const message = item.message || '(No Message Provided)';
            const variationLabel = index !== null ? `Variation ${index + 1}:\n` : '';
            return `${variationLabel}Subject: ${subject}\n\nMessage:\n${message}`;
        };
        // --- End Refactored Email Formatting Logic ---


        if (options.asHtml) {
            // Treat content as raw HTML
            displayContentHTML = content;
            rawTextForCopy = typeof content === 'string' ? content.replace(/<[^>]+>/g, '') : '';
        } else if (Array.isArray(content)) { // Handle array of email results
            displayContentHTML = content.map((item, index) => formatEmailItemForDisplay(item, index)).join(""); // Join directly, cards have margins
            rawTextForCopy = content.map((item, index) => formatEmailItemForCopy(item, index)).join('\n\n---\n\n');
        } else if (typeof content === 'object' && content !== null && (content.subject || content.message)) { // Handle single email result
            displayContentHTML = formatEmailItemForDisplay(content);
            rawTextForCopy = formatEmailItemForCopy(content);
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

    } else if (sender === 'user') { // user message - Changed else to else if
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        messageDiv.textContent = text; // Use textContent for user messages for safety
        messageDiv.dataset.rawText = text;
    } else if (sender === 'request-summary') { // Correctly placed else if
        // New type for request summary
        messageDiv.classList.add('request-summary-message');
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        messageDiv.textContent = text; // Use textContent for safety
        messageDiv.dataset.rawText = text; // Store for potential future use
    }
    // Removed duplicate/incorrect else if block here

    // Append the timestamp
    timestampSpan.textContent = formattedTimestamp; // Set the text content of the span
    messageDiv.appendChild(timestampSpan); // Append the span to the message div
 
    // For streaming SMS: insert before spinner if present and requested
    if (options.insertBeforeSpinner && sender === 'ai' && targetChatDisplay.lastElementChild && targetChatDisplay.lastElementChild.classList.contains('streaming-spinner')) {
        targetChatDisplay.insertBefore(messageDiv, targetChatDisplay.lastElementChild);
    } else {
        targetChatDisplay.insertAdjacentElement('beforeend', messageDiv);
    }
    targetChatDisplay.scrollTop = targetChatDisplay.scrollHeight;
    // Save state AFTER adding message
    saveState(); // Use the function passed during configuration

    // --- Save to Message History Cache ---
    // Only save final AI messages (not errors, spinners, validation failures, or info alerts like welcome)
    if (sender === 'ai' &&
        !messageDiv.classList.contains('alert-danger') && // Exclude explicit errors
        !messageDiv.classList.contains('streaming-spinner') &&
        !messageDiv.classList.contains('validation-failure-msg') &&
        !messageDiv.classList.contains('alert-info') // Exclude welcome/info messages
        ) {
        const messageDataToSave = {
            sender: sender,
            content: content, // Save the original content structure
            timestamp: formattedTimestamp,
            rawText: rawTextForCopy,
            asHtml: options.asHtml || false // Ensure asHtml is boolean
            // Add statusClass if needed for request-summary, but this is AI block
        };
        // Call the history saving function (already defined in this file)
        saveMessageToHistory(mode, messageDataToSave);
    }
    // --- End Save to Message History Cache ---

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
 * Updates the status indicator of a specific chat message.
 * @param {HTMLElement} messageElement - The message div element to update.
 * @param {string} statusText - The text to display (e.g., "(Completed)", "(Failed)").
 * @param {boolean} [isError=false] - If true, applies error styling.
 */
export function updateChatMessageStatus(messageElement, resultsCount = null, isError = false) {
    if (!messageElement || !messageElement.classList.contains('request-summary-message')) return;

    const mode = messageElement.closest('#sms-chat-area') ? 'sms' : 'email'; // Determine mode

    // --- Update Text Content ---
    let newText = messageElement.dataset.rawText || messageElement.textContent || ''; // Get original text
    const generatingText = `Generating ${mode.toUpperCase()}...`;
    let generatedText = `Generated ${mode.toUpperCase()} results`; // Default completion text

    // Try to extract requested count from original text if resultsCount not provided
    if (resultsCount === null && !isError) {
        const match = newText.match(/# Results: (\d+)/);
        if (match && match[1]) {
            resultsCount = parseInt(match[1], 10);
        }
    }

    if (!isError) {
        if (resultsCount !== null && resultsCount > 0) {
            generatedText = `Generated ${resultsCount} ${mode.toUpperCase()} result${resultsCount > 1 ? 's' : ''}`;
        }
        // Replace "Generating..." part with "Generated..." part
        newText = newText.replace(/^(Generating \w+\.\.\.)/, generatedText);
    } else {
        // Indicate failure in the text
        newText = newText.replace(/^(Generating \w+\.\.\.)/, `Failed to generate ${mode.toUpperCase()}`);
    }
    // Update the visible text content (excluding the timestamp span if present)
    const timestampSpan = messageElement.querySelector('.message-timestamp');
    if (timestampSpan) {
         // Find the text node before the timestamp and update it
         let textNode = timestampSpan.previousSibling;
         while(textNode && textNode.nodeType !== Node.TEXT_NODE) {
             textNode = textNode.previousSibling;
         }
         if (textNode) {
             textNode.textContent = newText + ' '; // Update text node content (add space before timestamp)
         } else {
              // Fallback if text node isn't found directly before timestamp
              messageElement.textContent = newText; // This might overwrite timestamp, less ideal
              messageElement.appendChild(timestampSpan); // Re-append timestamp
         }
    } else {
         messageElement.textContent = newText; // Update if no timestamp found
    }
    messageElement.dataset.rawText = newText; // Update raw text for potential future use/copy
    // --- End Update Text Content ---

    // Remove existing status classes first
    messageElement.classList.remove('status-completed', 'status-failed');

    // Add the appropriate class based on the error status
    if (isError) {
        messageElement.classList.add('status-failed');
    } else {
        messageElement.classList.add('status-completed');
    }

    // --- Save Completed Summary to History Cache ---
    // if (!isError) {
    //     const finalTimestamp = messageElement.querySelector('.message-timestamp')?.textContent || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }); // Get existing or generate new
    //     const messageDataToSave = {
    //         sender: 'request-summary', // Explicitly set sender
    //         content: newText, // The final text content
    //         timestamp: finalTimestamp,
    //         rawText: newText,
    //         asHtml: false, // Summary messages are text
    //         statusClass: isError ? 'status-failed' : 'status-completed' // Store the final status class
    //     };
    //     // saveMessageToHistory(mode, messageDataToSave); // REMOVED: Do not save request summaries to history
    // }
     // --- End Save Completed Summary ---

    // saveState(); // Don't save full state here, history cache is handled by saveMessageToHistory
}

/**
 * Saves a single message object to the local storage history cache for the given mode.
 * Limits the history to MAX_HISTORY_MESSAGES.
 * @param {string} mode - 'sms' or 'email'.
 * @param {object} messageData - The message object to save (e.g., { sender, content, timestamp, rawText, asHtml }).
 */
export function saveMessageToHistory(mode, messageData) {
    if (!mode || !messageData) {
        console.error("saveMessageToHistory: Missing mode or messageData");
        return;
    }
    const storageKey = `${mode}MessageHistory`;
    try {
        let history = JSON.parse(localStorage.getItem(storageKey) || '[]');
        // Add the new message to the beginning (or end, depending on desired display order)
        history.push(messageData);
        // Keep only the last MAX_HISTORY_MESSAGES
        if (history.length > MAX_HISTORY_MESSAGES) {
            history = history.slice(history.length - MAX_HISTORY_MESSAGES);
        }
        localStorage.setItem(storageKey, JSON.stringify(history));
        // Show the history button if it was hidden
        updateHistoryButtonVisibility(mode);
    } catch (error) {
        console.error(`Error saving message history for ${mode}:`, error);
    }
}

/**
 * Loads the message history array from local storage for the given mode.
 * @param {string} mode - 'sms' or 'email'.
 * @returns {Array} The array of message objects or an empty array if none found or error.
 */
export function loadMessageHistory(mode) {
    if (!mode) {
        console.error("loadMessageHistory: Missing mode");
        return [];
    }
    const storageKey = `${mode}MessageHistory`;
    try {
        const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error(`Error loading message history for ${mode}:`, error);
        return [];
    }
}

/**
 * Clears the message history cache from local storage for the given mode.
 * @param {string} mode - 'sms' or 'email'.
 */
export function clearMessageHistoryCache(mode) {
    if (!mode) {
        console.error("clearMessageHistoryCache: Missing mode");
        return;
    }
    const storageKey = `${mode}MessageHistory`;
    try {
        localStorage.removeItem(storageKey);
        console.log(`Message history cache cleared for ${mode}.`);
        // Hide the history button
        updateHistoryButtonVisibility(mode);
    } catch (error) {
        console.error(`Error clearing message history cache for ${mode}:`, error);
    }
}

/**
 * Displays messages from a history array into the chat display.
 * Clears the current display first (except the welcome message).
 * @param {string} mode - 'sms' or 'email'.
 * @param {Array} historyArray - Array of message objects from loadMessageHistory.
 */
export function displayHistoryMessages(mode, historyArray) {
    const targetChatDisplay = mode === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();
    if (!targetChatDisplay) {
        console.error(`displayHistoryMessages: Chat display for mode '${mode}' not found.`);
        return;
    }

    // Clear existing messages except the welcome message if present
    const welcomeMessage = targetChatDisplay.querySelector('.message.ai.alert-info');
    targetChatDisplay.innerHTML = ''; // Clear
    if (welcomeMessage) {
        targetChatDisplay.appendChild(welcomeMessage); // Add welcome message back if it existed
    } else {
        // Or add a default one if it wasn't there (shouldn't happen with current clearHistory logic)
        addWelcomeMessage(targetChatDisplay, mode);
    }


    if (!Array.isArray(historyArray) || historyArray.length === 0) {
        addMessageToChat('ai', 'No message history found in cache.', false, { asHtml: false });
        return;
    }

    addMessageToChat('ai', `--- Displaying Last ${historyArray.length} Cached Messages ---`, false, { asHtml: false });

    historyArray.forEach(msgData => {
        // Skip rendering request-summary messages from history
        if (msgData.sender === 'request-summary') {
            return; // Go to the next message in the loop
        }

        // Reconstruct the message in the chat display
        // We need to handle the structure carefully, especially for AI messages
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', msgData.sender);
        messageDiv.dataset.rawText = msgData.rawText || ''; // Restore raw text

        // Add timestamp if available
        if (msgData.timestamp) {
            const timestampSpan = document.createElement('span');
            timestampSpan.classList.add('message-timestamp');
            timestampSpan.textContent = msgData.timestamp; // Use stored timestamp
            // Note: We might want to store the Date object or ISO string and reformat here
            // For simplicity, using the stored string for now.
            messageDiv.appendChild(timestampSpan); // Append timestamp first or last? Let's try last.
        }


        if (msgData.sender === 'ai') {
            const isErrorMessage = typeof msgData.content === 'string' && msgData.content.startsWith('Error:');
            messageDiv.classList.add('alert', isErrorMessage ? 'alert-danger' : 'alert-info');
            messageDiv.setAttribute('role', 'alert');

            if (msgData.asHtml) {
                 messageDiv.innerHTML = msgData.content + (messageDiv.innerHTML); // Prepend existing timestamp
            } else if (Array.isArray(msgData.content)) { // Handle array of email results from history
                 // Use the *same* formatting logic as addMessageToChat
                 const formatEmailItemForDisplay = (item, index = null) => {
                     const subject = item.subject ? sanitize(item.subject) : '(No Subject Provided)';
                     const message = item.message || '(No Message Provided)';
                     const variationLabel = index !== null ? `Variation ${index + 1}` : 'Email Result';
                     return `
                         <div class="card email-variation mb-3">
                             <div class="card-header bg-light py-2">
                                 <strong class="me-2">${variationLabel}:</strong> ${subject}
                             </div>
                             <div class="card-body py-2">
                                 <pre class="email-body mb-0">${sanitize(message)}</pre>
                             </div>
                         </div>
                     `;
                 };
                 // Prepend existing timestamp/copy button to the formatted content
                 messageDiv.innerHTML = msgData.content.map((item, index) => formatEmailItemForDisplay(item, index)).join("") + (messageDiv.innerHTML);
            } else if (typeof msgData.content === 'object' && msgData.content !== null && (msgData.content.subject || msgData.content.message)) { // Handle single email result from history
                 // Use the *same* formatting logic as addMessageToChat
                 const formatEmailItemForDisplay = (item, index = null) => {
                     const subject = item.subject ? sanitize(item.subject) : '(No Subject Provided)';
                     const message = item.message || '(No Message Provided)';
                     const variationLabel = index !== null ? `Variation ${index + 1}` : 'Email Result';
                     return `
                         <div class="card email-variation mb-3">
                             <div class="card-header bg-light py-2">
                                 <strong class="me-2">${variationLabel}:</strong> ${subject}
                             </div>
                             <div class="card-body py-2">
                                 <pre class="email-body mb-0">${sanitize(message)}</pre>
                             </div>
                         </div>
                     `;
                 };
                  // Prepend existing timestamp/copy button to the formatted content
                 messageDiv.innerHTML = formatEmailItemForDisplay(msgData.content) + (messageDiv.innerHTML);
            } else { // Handle plain text (SMS or error message)
                 const text = typeof msgData.content === 'string' ? msgData.content : JSON.stringify(msgData.content);
                 // Create a text node and insert it before the timestamp
                 const textNode = document.createTextNode(sanitize(text) + ' '); // Add space before timestamp
                 messageDiv.insertBefore(textNode, messageDiv.firstChild);
            }


            // Add copy button
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.classList.add('btn', 'btn-sm', 'copy-msg-btn');
            copyButton.title = 'Copy message';
            copyButton.innerHTML = getCopyIconSVG();
            messageDiv.appendChild(copyButton); // Append copy button after content/timestamp

        } else { // User or request-summary message
            const text = typeof msgData.content === 'string' ? msgData.content : JSON.stringify(msgData.content);
             // Create a text node and insert it before the timestamp
            const textNode = document.createTextNode(text + ' '); // Add space before timestamp
            messageDiv.insertBefore(textNode, messageDiv.firstChild);
             if (msgData.sender === 'request-summary') {
                 messageDiv.classList.add('request-summary-message');
                 // Add status class if stored (assuming it might be)
                 if (msgData.statusClass) {
                    messageDiv.classList.add(msgData.statusClass);
                 }
             }
        }


        targetChatDisplay.appendChild(messageDiv);
    });

    targetChatDisplay.scrollTop = targetChatDisplay.scrollHeight; // Scroll to bottom
    console.log(`Displayed ${historyArray.length} messages from history for ${mode}.`);
}


/**
 * Updates the visibility of the Message History button based on cache existence.
 * @param {string} mode - 'sms' or 'email'.
 */
export function updateHistoryButtonVisibility(mode) {
    const historyButton = mode === 'sms' ? getSmsMessageHistoryButton() : getEmailMessageHistoryButton();
    if (!historyButton) return;

    const history = loadMessageHistory(mode);
    if (history.length > 0) {
        historyButton.classList.remove('d-none'); // Show button
    } else {
        historyButton.classList.add('d-none'); // Hide button
        // Reset button state if it was in "Clear" mode
        historyButton.textContent = 'Message History';
        historyButton.title = 'Show Message History';
        historyButton.classList.remove('btn-danger'); // Ensure it's not red
        historyButton.classList.add('btn-outline-info');
        // Make sure the event listener is reset in main.js if needed
    }
}

// --- Prompt Enhancement/Generation Logic ---

/**
 * Handles clicks on the "Enhance Prompt" buttons.
 * @param {Event} event - The click event.
 */
async function handleEnhanceClick(event) {
    const mode = getCurrentMode();
    const userInput = mode === 'sms' ? getSmsUserInput() : getEmailUserInput();
    const button = event.target; // The button that was clicked

    if (!userInput) {
        console.error("Enhance failed: User input element not found.");
        addMessageToChat('ai', 'Error: Could not find the chat input box.', false, { asHtml: false });
        return;
    }

    const currentText = userInput.value.trim();
    if (!currentText) {
        addMessageToChat('ai', 'Info: Please enter some text in the chat box to enhance.', false, { asHtml: false });
        return;
    }

    // Disable button and show loading state
    button.disabled = true;
    button.textContent = 'Enhancing...';
    button.title = 'Processing...';

    try {
        const result = await enhancePrompt(mode, currentText); // Call API function
        if (result && result.enhancedPrompt) {
            userInput.value = result.enhancedPrompt; // Update textarea
            addMessageToChat('ai', 'Prompt enhanced successfully.', false, { asHtml: false });
            // Trigger input event to update settings glow if needed
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            throw new Error(result?.error || 'Received invalid response from server.');
        }
    } catch (error) {
        console.error('Error enhancing prompt:', error);
        addMessageToChat('ai', `Error enhancing prompt: ${error.message}`, false, { asHtml: false });
    } finally {
        // Re-enable button and restore text/title
        button.disabled = false;
        button.textContent = 'Enhance Prompt';
        button.title = 'Enhance current prompt text';
    }
}

/**
 * Handles clicks on the "Generate Prompt" buttons.
 * @param {Event} event - The click event.
 */
async function handleGenerateClick(event) {
    const mode = getCurrentMode();
    const userInput = mode === 'sms' ? getSmsUserInput() : getEmailUserInput();
    const topicInput = getTopicInput();
    const toneInput = getToneInput();
    const button = event.target; // The button that was clicked

    if (!userInput || !topicInput || !toneInput) {
        console.error("Generate failed: Required input elements not found.");
        addMessageToChat('ai', 'Error: Could not find Topic/Tone settings or chat input box.', false, { asHtml: false });
        return;
    }

    const topic = topicInput.value.trim();
    const tone = toneInput.value.trim();

    if (!topic || !tone) {
        addMessageToChat('ai', 'Info: Please enter both a "Topic" and a "Desired Tone" in the Settings panel to generate a prompt.', false, { asHtml: false });
        // Optionally focus the first empty field
        if (!topic) topicInput.focus();
        else toneInput.focus();
        return;
    }

    // Disable button and show loading state
    button.disabled = true;
    button.textContent = 'Generating...';
    button.title = 'Processing...';

    try {
        const result = await generatePrompt(mode, topic, tone); // Call API function
        if (result && result.generatedPrompt) {
            userInput.value = result.generatedPrompt; // Update textarea
            addMessageToChat('ai', `Prompt generated for Topic: "${topic}", Tone: "${tone}".`, false, { asHtml: false });
            // Trigger input event to update settings glow if needed
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            throw new Error(result?.error || 'Received invalid response from server.');
        }
    } catch (error) {
        console.error('Error generating prompt:', error);
        addMessageToChat('ai', `Error generating prompt: ${error.message}`, false, { asHtml: false });
    } finally {
        // Re-enable button and restore text/title
        button.disabled = false;
        button.textContent = 'Generate Prompt';
        button.title = 'Generate prompt from Topic & Tone settings';
    }
}

// --- End Prompt Enhancement/Generation Logic ---


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
    // Check initial history state for both modes
    updateHistoryButtonVisibility('sms');
    updateHistoryButtonVisibility('email');

    // Add listeners for new prompt buttons
    const smsEnhanceBtn = getSmsEnhanceButton();
    const smsGenerateBtn = getSmsGenerateButton();
    const emailEnhanceBtn = getEmailEnhanceButton();
    const emailGenerateBtn = getEmailGenerateButton();

    if (smsEnhanceBtn) smsEnhanceBtn.addEventListener('click', handleEnhanceClick);
    else console.warn("Chat Init: SMS Enhance button not found.");

    if (smsGenerateBtn) smsGenerateBtn.addEventListener('click', handleGenerateClick);
    else console.warn("Chat Init: SMS Generate button not found.");

    if (emailEnhanceBtn) emailEnhanceBtn.addEventListener('click', handleEnhanceClick);
    else console.warn("Chat Init: Email Enhance button not found.");

    if (emailGenerateBtn) emailGenerateBtn.addEventListener('click', handleGenerateClick);
    else console.warn("Chat Init: Email Generate button not found.");


    console.log("Chat module initialized.");
}