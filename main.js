// Entry point for SMS Generator Frontend (ES Modules)
// Wires up all modules and initializes the app

import { initializeModal, configureModal, handleModalInputKeydown } from './modal.js'; // Added configureModal
import { generateContent, LOCALSTORAGE_API_KEY_NAME, validateApiKey } from './api.js'; // Added validateApiKey
import { initializeChat, configureChat, addMessageToChat, clearHistory, downloadAiHistory } from './chat.js'; // Added clear/download
import { initializeFileHandlers, configureFileHandlers, handleFileUpload, getMarketingData, getSmsData, clearFiles } from './file.js'; // Added clearFiles
import { initializeSettings, configureSettings, getSettings, clearSettings, clearProject, updateAllSettingsGlows, storeDefaultSettings } from './settings.js'; // Added clear functions, glow/store
import { initializeMode, getCurrentMode, loadInitialModeStates, updateDynamicHeader } from './mode.js'; // Added mode module
import { autoResizeTextarea, debounce } from './utils.js'; // Added utils

// SVG icon for copy button (used in chat.js)
const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;

// Removed placeholder currentMode and defaultSettingsValues, now managed by mode.js and settings.js

// Removed placeholder getCurrentMode, using imported one

function getSmsChatDisplay() {
    return document.getElementById('sms-chat-display');
}

function getEmailChatDisplay() {
    return document.getElementById('email-chat-display');
}

function getCopyIconSVG() {
    return copyIconSVG;
}

// --- Local Storage Constants ---
const LS_PROJECT_KEY = 'smsGenProject';
const LS_MODE_KEY = 'smsGenMode';
const LS_HISTORY_KEY_PREFIX = 'smsGenHistory_'; // smsGenHistory_sms, smsGenHistory_email
const LS_USER_INPUT_KEY_PREFIX = 'smsGenUserInput_'; // smsGenUserInput_sms, smsGenUserInput_email
const LS_MARKETING_FILE_STATUS_KEY = 'smsGenMarketingFileStatus';
const LS_SMS_FILE_STATUS_KEY = 'smsGenSmsFileStatus';

// --- Local Storage Function ---
// Debounced save function to avoid excessive writes
const debouncedSave = debounce(() => {
    try {
        const mode = getCurrentMode(); // Get current mode from mode.js
        const projectSelect = getProjectSelect();
        const smsChatDisplay = getSmsChatDisplay();
        const emailChatDisplay = getEmailChatDisplay();
        const smsUserInput = document.getElementById('sms-user-input');
        const emailUserInput = document.getElementById('email-user-input');
        const marketingFileStatus = getMarketingFileStatus();
        const smsFileStatus = getSmsFileStatus();

        // Save common state
        if (projectSelect) localStorage.setItem(LS_PROJECT_KEY, projectSelect.value);
        localStorage.setItem(LS_MODE_KEY, mode);

        // Save history and input for BOTH modes
        if (smsChatDisplay) localStorage.setItem(`${LS_HISTORY_KEY_PREFIX}sms`, smsChatDisplay.innerHTML);
        if (emailChatDisplay) localStorage.setItem(`${LS_HISTORY_KEY_PREFIX}email`, emailChatDisplay.innerHTML);
        if (smsUserInput) localStorage.setItem(`${LS_USER_INPUT_KEY_PREFIX}sms`, smsUserInput.value);
        if (emailUserInput) localStorage.setItem(`${LS_USER_INPUT_KEY_PREFIX}email`, emailUserInput.value);

        // Save file statuses (common)
        if (marketingFileStatus) {
            localStorage.setItem(LS_MARKETING_FILE_STATUS_KEY, marketingFileStatus.textContent);
            localStorage.setItem(LS_MARKETING_FILE_STATUS_KEY + '_class', marketingFileStatus.className);
        }
        if (smsFileStatus) {
            localStorage.setItem(LS_SMS_FILE_STATUS_KEY, smsFileStatus.textContent);
            localStorage.setItem(LS_SMS_FILE_STATUS_KEY + '_class', smsFileStatus.className);
        }
        // console.log('State saved to localStorage.'); // Optional: for debugging
    } catch (error) {
        console.error('Error saving state to localStorage:', error);
        addMessageToChat('ai', 'Warning: Could not save application state. LocalStorage might be full or disabled.');
    }
}, 300); // Debounce saves by 300ms

// Expose saveStateToLocalStorage globally or pass it where needed
function saveStateToLocalStorage() {
    debouncedSave();
}

function getMarketingFileStatus() {
    return document.getElementById('marketing-file-status');
}

function getSmsFileStatus() {
    return document.getElementById('sms-file-status');
}

function getSettingsForm() {
    return document.getElementById('settings-form');
}

function getProjectSelect() {
    return document.getElementById('project');
}

function getNumResultsInput() {
    return document.getElementById('num-results');
}

// Removed placeholder getDefaultSettingsValues, now managed by settings.js

import { showApiKeyModal } from './modal.js';
// Removed duplicate import of validateApiKey here

document.addEventListener('DOMContentLoaded', async () => {
    initializeModal();
    // Initialize core modules first
    // initializeModal(); // Removed duplicate call
    initializeChat(); // Basic chat init
    initializeFileHandlers(); // Basic file init
    // initializeSettings(); // Moved after configureSettings

    // Initialize mode module - this sets the initial mode and UI
    initializeMode({
        saveState: saveStateToLocalStorage,
        addMessage: addMessageToChat
    });

    // On load, check for API key and validate it. If missing or invalid, show modal.
    const apiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
    if (!apiKey) {
        showApiKeyModal();
    } else {
        // Validate with backend
        const result = await validateApiKey(apiKey);
        if (!result.ok) {
            localStorage.removeItem(LOCALSTORAGE_API_KEY_NAME);
            showApiKeyModal();
        } else {
            // If key exists, still update header and glows based on loaded mode
            updateDynamicHeader();
        storeDefaultSettings(); // Ensure defaults are stored for the loaded mode
        updateAllSettingsGlows();
    }
}

    // Configure modules with dependencies
    configureModal({ addMessage: addMessageToChat }); // Configure modal first
    configureChat({
        getCurrentMode: getCurrentMode, // Pass the imported function
        getSmsChatDisplay,
        getEmailChatDisplay,
        getCopyIconSVG,
        saveState: saveStateToLocalStorage,
        getProjectSelect: getProjectSelect // Pass project select for download filename
    });

    // Configure file handlers with dependencies
    configureFileHandlers({
        getMarketingFileStatus,
        getSmsFileStatus,
        saveState: saveStateToLocalStorage,
        addMessage: addMessageToChat
    });

    // Configure settings module with dependencies
    configureSettings({
        getSettingsForm,
        getCurrentMode: getCurrentMode, // Pass the imported function
        // getDefaultSettingsValues is now internal to settings.js
        getProjectSelect,
        getNumResultsInput, // Added missing comma
        saveState: saveStateToLocalStorage // Pass save state for glow updates
    });

    // Initialize settings AFTER configuration
    initializeSettings();

    // Load initial chat history and input values for BOTH modes AFTER initialization
    loadInitialModeStates(); // Loads history, input, and potentially project selection

    // Update header AFTER mode and project are potentially loaded
    updateDynamicHeader();

    // Resize textareas after potentially loading content
    autoResizeTextarea(document.getElementById('sms-user-input'));
    autoResizeTextarea(document.getElementById('email-user-input'));

    // File input event listeners
    const marketingFileInput = document.getElementById('marketing-file');
    const smsFileInput = document.getElementById('sms-file');
    if (marketingFileInput) {
        marketingFileInput.addEventListener('change', (e) => handleFileUpload(e, 'marketing'));
    }
    if (smsFileInput) {
        smsFileInput.addEventListener('change', (e) => handleFileUpload(e, 'sms'));
    }

    // Modal event listeners
    const validateKeyButton = document.getElementById('validate-key-button');
    const modalApiKeyInput = document.getElementById('modal-api-key-input');
    if (validateKeyButton) {
        validateKeyButton.addEventListener('click', () => {
            handleModalInputKeydown({ key: 'Enter', preventDefault: () => {} });
        });
    }
    if (modalApiKeyInput) {
        modalApiKeyInput.addEventListener('keydown', handleModalInputKeydown);
    }

    // --- Send Logic ---
    const smsUserInput = document.getElementById('sms-user-input');
    const emailUserInput = document.getElementById('email-user-input');
    const smsSendButton = document.getElementById('sms-send-button');
    const emailSendButton = document.getElementById('email-send-button');

    // Generic function to handle sending for either mode
    async function handleSendMessage() {
        const mode = getCurrentMode();
        const userInputElement = mode === 'sms' ? smsUserInput : emailUserInput;
        const sendButtonElement = mode === 'sms' ? smsSendButton : emailSendButton;
        const prompt = userInputElement.value.trim();

        const settings = getSettings(); // getSettings is now mode-aware
        const apiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
        const marketingData = getMarketingData(); // Only relevant for SMS, but harmless to include
        const smsData = getSmsData(); // Only relevant for SMS

        // Validation: Prompt required for SMS, optional for Email if settings have content
        const hasEmailContentInSettings = mode === 'email' && (settings.subject || settings.message);
        if (!prompt && !hasEmailContentInSettings) {
            userInputElement.focus();
            return;
        }
        if (!apiKey) {
            addMessageToChat('ai', 'Error: API Key not set or validated. Please enter your key.');
            showApiKeyModal();
            return;
        }

        // Disable button and show spinner
        sendButtonElement.disabled = true;
        sendButtonElement.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span class="visually-hidden">Sending...</span>';
        sendButtonElement.title = "Generating...";

        // Add user message to chat UI (if there was a prompt)
        if (prompt) {
            addMessageToChat('user', prompt);
        }
        userInputElement.value = ''; // Clear input
        autoResizeTextarea(userInputElement); // Resize cleared input
        saveStateToLocalStorage(); // Save cleared input state

        // Show "thinking" spinner in chat
        const thinkingMessage = addMessageToChat('ai', 'Generating...', true); // Pass true to return the element

        try {
            const { ok, data, error } = await generateContent({
                apiKey,
                userPrompt: prompt,
                settings, // Includes mode
                marketingData,
                smsData
            });

            // Remove the "Generating..." message
            thinkingMessage?.remove();

            if (!ok) {
                // Handle specific errors like 401/403 if needed (similar to old code)
                if (error?.includes('401') || error?.includes('Unauthorized')) {
                     addMessageToChat('ai', `Error: Invalid or unauthorized API Key. Please refresh or re-enter.`);
                     localStorage.removeItem(LOCALSTORAGE_API_KEY_NAME);
                     showApiKeyModal();
                } else if (error?.includes('403') || error?.includes('Forbidden')) {
                     addMessageToChat('ai', `Error: Access Denied. Ensure you are using an allowed connection.`);
                } else {
                    addMessageToChat('ai', `Error: ${error || 'Unknown error during generation.'}`);
                }
                return;
            }

            // Handle SMS (text) or Email (JSON) response
            // addMessageToChat is now mode-aware and handles formatting
            addMessageToChat('ai', data);

        } catch (err) {
            thinkingMessage?.remove(); // Ensure spinner removed on network error too
            console.error('Error calling generateContent:', err);
            addMessageToChat('ai', `Error: Network error or issue sending request. (${err.message || err})`);
        } finally {
            // Re-enable button and restore icon
            sendButtonElement.disabled = false;
            sendButtonElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
            sendButtonElement.title = `Send ${mode === 'sms' ? 'SMS' : 'Email'} Request (Ctrl+Enter)`;
        }
    }

    // Add listeners for both textareas (input and keydown)
    [smsUserInput, emailUserInput].forEach(input => {
        if (input) {
            // Save state on input
            input.addEventListener('input', () => {
                autoResizeTextarea(input);
                saveStateToLocalStorage(); // Save input changes
            });
            // Ctrl+Enter sends
            input.addEventListener('keydown', (event) => {
                // Send on Enter (but not Shift+Enter for newlines)
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault(); // Prevent adding a newline
                    handleSendMessage(); // handleSendMessage determines which input/button to use
                }
                // Allow Shift+Enter to add a newline (no preventDefault needed here)
            });
        }
    });

    // Add listeners for both send buttons
    if (smsSendButton) smsSendButton.addEventListener('click', handleSendMessage);
    if (emailSendButton) emailSendButton.addEventListener('click', handleSendMessage);


    // --- Clear Button Listeners ---
    const clearProjectButton = document.getElementById('clear-project-button');
    const clearSmsHistoryButton = document.getElementById('clear-sms-history-button');
    const clearEmailHistoryButton = document.getElementById('clear-email-history-button');
    const clearSettingsButton = document.getElementById('clear-settings-button');
    const clearFilesButton = document.getElementById('clear-files-button-left');

    if (clearProjectButton) clearProjectButton.addEventListener('click', () => { clearProject(); saveStateToLocalStorage(); updateDynamicHeader(); });
    if (clearSmsHistoryButton) clearSmsHistoryButton.addEventListener('click', () => { clearHistory('sms'); saveStateToLocalStorage(); });
    if (clearEmailHistoryButton) clearEmailHistoryButton.addEventListener('click', () => { clearHistory('email'); saveStateToLocalStorage(); });
    if (clearSettingsButton) clearSettingsButton.addEventListener('click', () => { clearSettings(); saveStateToLocalStorage(); }); // clearSettings handles glow update
    if (clearFilesButton) clearFilesButton.addEventListener('click', () => { clearFiles(); saveStateToLocalStorage(); });

    // --- Download Button Listeners ---
    const downloadSmsHistoryButton = document.getElementById('download-sms-history-button');
    const downloadEmailHistoryButton = document.getElementById('download-email-history-button');

    if (downloadSmsHistoryButton) downloadSmsHistoryButton.addEventListener('click', () => downloadAiHistory('sms'));
    if (downloadEmailHistoryButton) downloadEmailHistoryButton.addEventListener('click', () => downloadAiHistory('email'));

    // --- Settings Form Listener (for individual clear buttons) ---
    const settingsForm = getSettingsForm();
    if (settingsForm) {
        // Delegate click for clear buttons within the form
        settingsForm.addEventListener('click', (event) => {
            const clearButton = event.target.closest('.clear-input-btn');
            if (clearButton) {
                const targetInputId = clearButton.dataset.targetInput;
                if (targetInputId) {
                    const targetInput = document.getElementById(targetInputId);
                    if (targetInput) {
                        // Use the clearInput function from settings.js if available,
                        // otherwise, fallback to basic reset (though settings.js should handle it)
                        if (typeof window.clearIndividualSetting === 'function') { // Assuming settings.js might expose it
                            window.clearIndividualSetting(targetInput);
                        } else {
                            // Fallback logic (less ideal as it doesn't use stored defaults directly)
                            if (targetInput.type === 'checkbox') targetInput.checked = false; // Or true depending on default
                            else targetInput.value = '';
                            triggerInputEvent(targetInput); // Ensure glow updates
                        }
                        saveStateToLocalStorage(); // Save after clearing
                    }
                }
            }
        });

        // Also save state on any input change within the form
        settingsForm.addEventListener('input', saveStateToLocalStorage);
    }

     // --- Project Select Listener ---
     const projectSelect = getProjectSelect();
     if (projectSelect) {
         projectSelect.addEventListener('change', () => {
             saveStateToLocalStorage();
             updateDynamicHeader(); // Update header on project change
         });
     }

    console.log("App initialized.");
});