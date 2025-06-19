// Entry point for SMS Generator Frontend (ES Modules)
// Wires up all modules and initializes the app
// --- WebSocket Streaming Support ---
import { v4 as uuidv4 } from 'https://jspm.dev/uuid'; // Use UUID for sessionId

// Map to store summary message elements for active WebSocket sessions
const activeRequestSummaries = new Map();

let ws = null;
let sessionId = null;
let wsReady = false;
let wsQueue = [];

function connectWebSocket() {
    sessionId = uuidv4();
    // Determine WebSocket URL based on hostname
    let wsUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development: Connect to local backend (assuming port 3001)
        wsUrl = 'ws://localhost:3001';
    } else {
        // Deployed environment: Connect to Render backend
        wsUrl = 'wss://cms-backend-zzz5.onrender.com';
    }
    console.log(`Connecting WebSocket to: ${wsUrl}`); // Log the chosen URL
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
        wsReady = true;
        ws.send(JSON.stringify({ type: 'register', sessionId }));
        // Flush any queued messages
        wsQueue.forEach(msg => ws.send(msg));
        wsQueue = [];
    };
    // --- Streaming SMS Loading Spinner Management ---
    let streamingSpinner = null;
    let streamingInProgress = false;
    ws.onmessage = (event) => {
        // Retrieve the summary message element associated with this session
        let summaryElement = null;
        let receivedSessionId = null;
        try {
            const data = JSON.parse(event.data);
            // Attempt to get sessionId from the message data (backend needs to include this)
            if (data.sessionId) {
                receivedSessionId = data.sessionId;
                summaryElement = activeRequestSummaries.get(receivedSessionId);
            }

            if (data.type === 'sms') {
                // Parse SMS to separate message from template URL
                const smsText = data.sms;
                const urlMatch = smsText.match(/(.*?)(>>> https?:\/\/[^\s]+)$/);
                
                let messageOnly, charCount;
                if (urlMatch) {
                    messageOnly = urlMatch[1].trim();
                    charCount = messageOnly.length;
                } else {
                    messageOnly = smsText;
                    charCount = smsText.length;
                }
                
                // Create formatted message without template URL
                const formattedMessage = `<div class="sms-message-content">${messageOnly}</div><div class="sms-char-count">${charCount} chars</div>`;
                
                addMessageToChat('ai', formattedMessage, false, {
                    asHtml: true,
                    insertBeforeSpinner: true,
                    messageOnly: messageOnly
                });
            } else if (data.type === 'progress') {
                // Show spinner if not already shown
                if (!streamingInProgress) {
                    streamingSpinner = addMessageToChat(
                        'ai',
                        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Generating...',
                        true,
                        { asHtml: true }
                    );
                    if (streamingSpinner) streamingSpinner.classList.add('streaming-spinner');
                    streamingInProgress = true;
                }
            } else if (data.type === 'validation_failed') {
                // Remove previous validation failure messages
                const chatDisplay = getSmsChatDisplay();
                if (chatDisplay) {
                    chatDisplay.querySelectorAll('.validation-failure-msg').forEach(el => el.remove());
                }
                // Add new validation failure message with error style and unique class
                const msg = `<span style="font-weight:bold;">Validation failed (attempt ${data.attempt}):</span> ${data.errors.join('; ')}`;
                const msgDiv = addMessageToChat(
                    'ai',
                    msg,
                    true,
                    { asHtml: true }
                );
                if (msgDiv) {
                    msgDiv.classList.add('validation-failure-msg', 'alert-danger');
                    msgDiv.classList.remove('alert-info');
                }
            } else if (data.type === 'error') {
                addMessageToChat('ai', `Error: ${data.error}`);
                // Update summary status if element found
                if (summaryElement) {
                    updateChatMessageStatus(summaryElement, "(Failed)", true);
                    activeRequestSummaries.delete(receivedSessionId); // Clean up map
                }
            } else if (data.type === 'done') {
                // Remove spinner when done
                if (streamingSpinner) {
                    streamingSpinner.remove();
                    streamingSpinner = null;
                }
                streamingInProgress = false;
                // Remove all validation failure messages when done
                const chatDisplay = getSmsChatDisplay();
                if (chatDisplay) {
                    chatDisplay.querySelectorAll('.validation-failure-msg').forEach(el => el.remove());
                }
                // Remove request summary messages when generation is complete
                const currentMode = getCurrentMode();
                const targetChatDisplay = currentMode === 'sms' ? getSmsChatDisplay() : getEmailChatDisplay();
                if (targetChatDisplay) {
                    removeRequestSummaryMessages(targetChatDisplay);
                }
                // Update summary status if element found
                if (summaryElement) {
                    // Pass null for count; chat.js function will try to infer from original text
                    updateChatMessageStatus(summaryElement, null, false); // false for isError
                    activeRequestSummaries.delete(receivedSessionId); // Clean up map
                }
            }
        } catch (e) {
            // Ignore malformed
        }
    };
    ws.onclose = () => {
        wsReady = false;
        // Optionally try to reconnect
    };
}
connectWebSocket();


import { initializeModal, configureModal, handleModalInputKeydown } from './modal.js'; // Added configureModal
import { generateContent, LOCALSTORAGE_API_KEY_NAME, validateApiKey } from './api.js'; // Added validateApiKey
import {
    initializeChat, configureChat, addMessageToChat, clearHistory, downloadAiHistory, updateChatMessageStatus,
    loadMessageHistory, clearMessageHistoryCache, displayHistoryMessages, updateHistoryButtonVisibility, addWelcomeMessage, removeWelcomeMessage, removeRequestSummaryMessages // Added history cache functions
} from './chat.js';
import { initializeFileHandlers, configureFileHandlers, handleFileUpload, getMarketingData, getSmsData, clearFiles } from './file.js'; // Added clearFiles
import { initializeSettings, configureSettings, getSettings, clearSettings, clearProject, updateAllSettingsGlows, storeDefaultSettings } from './settings.js'; // Added clear functions, glow/store
import { initializeMode, getCurrentMode } from './mode.js'; // Removed originalLoadInitialModeStates
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

// SVG icon for check/success state
const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>`;

function getCheckIconSVG() {
    return checkIconSVG;
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

        // Save input for BOTH modes (History is now handled by chat.js cache)
        // if (smsChatDisplay) localStorage.setItem(`${LS_HISTORY_KEY_PREFIX}sms`, smsChatDisplay.innerHTML); // REMOVED - Handled by cache
        // if (emailChatDisplay) localStorage.setItem(`${LS_HISTORY_KEY_PREFIX}email`, emailChatDisplay.innerHTML); // REMOVED - Handled by cache
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

function getSmsMessageHistoryButton() {
    return document.getElementById('sms-message-history-button');
}

function getEmailMessageHistoryButton() {
    return document.getElementById('email-message-history-button');
}

// --- Getters for Prompt Enhancement/Generation Elements ---
function getSmsUserInput() {
    return document.getElementById('sms-user-input');
}
function getEmailUserInput() {
    return document.getElementById('email-user-input');
}
function getTopicInput() { // Renamed conceptually, points to select now
    return document.getElementById('topic-select');
}
function getTopicCustomInput() { // New getter for custom input
    return document.getElementById('topic-custom');
}
function getToneInput() { // Corrected to point to the tone select
    return document.getElementById('tone');
}
function getSmsEnhanceButton() {
    return document.getElementById('sms-enhance-button');
}
function getSmsGenerateButton() {
    return document.getElementById('sms-generate-button');
}
function getEmailEnhanceButton() {
    return document.getElementById('email-enhance-button');
}
function getEmailGenerateButton() {
    return document.getElementById('email-generate-button');
}
// --- End Getters ---


// Removed placeholder getDefaultSettingsValues, now managed by settings.js

import { showApiKeyModal } from './modal.js';
// Removed duplicate import of validateApiKey here

document.addEventListener('DOMContentLoaded', async () => {
    // Rate limiting variables - must be declared early
    const RATE_LIMIT = {
        maxRequests: 3,
        windowMs: 60 * 1000, // 1 minute
        blockDurationMs: 2 * 60 * 1000 // 2 minutes
    };
    let requestTimestamps = JSON.parse(localStorage.getItem('apiRequestTimestamps') || '[]');

    initializeModal();
    // Initialize core modules first
    // initializeModal(); // Removed duplicate call
    // initializeChat(); // Moved after configureChat
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
        storeDefaultSettings(); // Ensure defaults are stored for the loaded mode
        updateAllSettingsGlows();
    }
}

    // Configure modules with dependencies
    configureModal({ addMessage: addMessageToChat }); // Configure modal first
    configureChat({ // CONFIGURE FIRST
        getCurrentMode: getCurrentMode, // Pass the imported function
        getSmsChatDisplay,
        getEmailChatDisplay,
        getCopyIconSVG,
        getCheckIconSVG,
        saveState: saveStateToLocalStorage,
        getProjectSelect: getProjectSelect, // Pass project select for download filename
        getSmsMessageHistoryButton: getSmsMessageHistoryButton, // Pass history button getter
        getEmailMessageHistoryButton: getEmailMessageHistoryButton, // Pass history button getter
        // Pass getters for prompt enhancement/generation
        getSmsUserInput: getSmsUserInput,
        getEmailUserInput: getEmailUserInput,
        getTopicInput: getTopicInput, // Now points to topic-select
        getTopicCustomInput: getTopicCustomInput, // Pass new getter
        getToneInput: getToneInput, // Corrected getter
        getSmsEnhanceButton: getSmsEnhanceButton,
        getSmsGenerateButton: getSmsGenerateButton,
        getEmailEnhanceButton: getEmailEnhanceButton,
        getEmailGenerateButton: getEmailGenerateButton
    });
    initializeChat(); // INITIALIZE AFTER CONFIGURE

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

    // Initial state loading (project, mode, input) is handled by initializeMode.
    // Welcome messages are added by initializeMode if needed.
    // History button visibility is handled by initializeChat.

    // Mode and project loaded

    // Update rate limit status on page load
    updateRateLimitStatus();

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

    // Function to check and enforce rate limiting
    function checkRateLimit() {
        const now = Date.now();
        
        // Remove old timestamps outside the window
        requestTimestamps = requestTimestamps.filter(timestamp =>
            now - timestamp < RATE_LIMIT.windowMs + RATE_LIMIT.blockDurationMs
        );
        
        // Check if we're currently blocked
        const recentRequests = requestTimestamps.filter(timestamp =>
            now - timestamp < RATE_LIMIT.windowMs
        );
        
        if (recentRequests.length >= RATE_LIMIT.maxRequests) {
            const oldestRecentRequest = Math.min(...recentRequests);
            const blockUntil = oldestRecentRequest + RATE_LIMIT.blockDurationMs;
            
            if (now < blockUntil) {
                const waitTime = Math.ceil((blockUntil - now) / 1000);
                return { blocked: true, waitTime };
            }
        }
        
        return { blocked: false };
    }

    // Function to record a new request
    function recordRequest() {
        const now = Date.now();
        requestTimestamps.push(now);
        localStorage.setItem('apiRequestTimestamps', JSON.stringify(requestTimestamps));
    }

    // Function to show rate limit warning
    function showRateLimitWarning(waitTime) {
        const minutes = Math.floor(waitTime / 60);
        const seconds = waitTime % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        
        alert(`⚠️ Rate Limit Exceeded\n\nYou've made too many requests recently. To control API costs, please wait ${timeString} before making another request.\n\nLimit: ${RATE_LIMIT.maxRequests} requests per minute`);
        
        // Update status indicator
        updateRateLimitStatus();
    }

    // Function to update rate limit status indicator
    function updateRateLimitStatus() {
        const statusElement = document.getElementById('rate-limit-status');
        if (!statusElement) return;

        const rateLimitCheck = checkRateLimit();
        const now = Date.now();
        const recentRequests = requestTimestamps.filter(timestamp =>
            now - timestamp < RATE_LIMIT.windowMs
        );

        if (rateLimitCheck.blocked) {
            const minutes = Math.floor(rateLimitCheck.waitTime / 60);
            const seconds = rateLimitCheck.waitTime % 60;
            const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            
            statusElement.innerHTML = `<span class="text-danger">⚠</span> Rate limited: wait ${timeString}`;
            statusElement.className = 'small text-danger mt-1';
            statusElement.style.display = 'block';
        } else if (recentRequests.length >= RATE_LIMIT.maxRequests - 1) {
            statusElement.innerHTML = `<span class="text-warning">⚠</span> Rate limit: ${recentRequests.length}/${RATE_LIMIT.maxRequests} requests used`;
            statusElement.className = 'small text-warning mt-1';
            statusElement.style.display = 'block';
        } else if (recentRequests.length > 0) {
            statusElement.innerHTML = `<span class="text-info">ℹ</span> Rate limit: ${recentRequests.length}/${RATE_LIMIT.maxRequests} requests used`;
            statusElement.className = 'small text-muted mt-1';
            statusElement.style.display = 'block';
        } else {
            statusElement.style.display = 'none';
        }
    }

    // Generic function to handle sending for either mode
    async function handleSendMessage() {
        // Check rate limit first
        const rateLimitCheck = checkRateLimit();
        if (rateLimitCheck.blocked) {
            showRateLimitWarning(rateLimitCheck.waitTime);
            return;
        }

        const mode = getCurrentMode();
        const userInputElement = mode === 'sms' ? smsUserInput : emailUserInput;
        const sendButtonElement = mode === 'sms' ? smsSendButton : emailSendButton;
        const prompt = userInputElement.value.trim();

        let settings = getSettings(); // getSettings is now mode-aware. Use 'let' as we might modify it.
        const apiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
        const marketingData = getMarketingData(); // Only relevant for SMS, but harmless to include
        const smsData = getSmsData(); // Only relevant for SMS

        // Number of results is now controlled entirely by the right sidebar setting
        // No more extraction from user prompt

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

        // Record this request for rate limiting
        recordRequest();
        
        // Update rate limit status
        updateRateLimitStatus();

        // --- Hide History Button if Visible ---
        const historyButton = mode === 'sms' ? getSmsMessageHistoryButton() : getEmailMessageHistoryButton();
        if (historyButton && !historyButton.classList.contains('d-none')) {
            // Only hide if it's currently the "Message History" button, not "Clear"
            if (!historyButton.textContent.includes('Clear')) {
                 historyButton.classList.add('d-none');
            }
        }
        // --- End Hide History Button ---

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

        // Show "thinking" spinner in chat - ONLY for non-SMS modes
        let thinkingMessage = null;
        if (mode !== 'sms') {
            thinkingMessage = addMessageToChat('ai', 'Generating...', true);
        }

        // --- Add Request Summary Message ---
        let summaryMessageElement = null;
        try {
            const summaryParts = [];
            summaryParts.push(`Project: ${settings.project || 'Default'}`);
            if (settings.topic) summaryParts.push(`Topic: ${settings.topic}`);
            if (settings.date) summaryParts.push(`Date: ${settings.date}`);
            if (settings.tone) summaryParts.push(`Tone: ${settings.tone}`);
            if (settings.length) summaryParts.push(`Length: ${settings.length}`);
            if (mode === 'sms') {
                 summaryParts.push(`Emojis: ${settings.use_emojis === false ? 'No' : 'Yes'}`);
                 summaryParts.push(`# Results: ${settings.num_results || 1}`);
                 if (settings.href) summaryParts.push(`Link: Provided`);
            }
             if (mode === 'email') {
                 summaryParts.push(`# Results: ${settings.num_results || 1}`);
                 if (settings.subject) summaryParts.push(`Subject: Provided`);
                 if (settings.message) summaryParts.push(`Body: Provided`);
            }
            const summaryString = `Generating ${mode.toUpperCase()}... (${summaryParts.join(', ')})`;
            summaryMessageElement = addMessageToChat('request-summary', summaryString, true); // Get the element
            // Store summary element for WebSocket updates if in SMS mode
            if (mode === 'sms' && sessionId && summaryMessageElement) {
                activeRequestSummaries.set(sessionId, summaryMessageElement);
            }
        } catch (summaryError) {
            console.error("Error creating summary message:", summaryError);
            // Don't block the main request if summary fails
        }
        // --- End Request Summary Message ---


        let apiResultOk = false;
        let apiData = null;

        try {
            // Log the final settings being sent
            console.log("Sending settings to backend:", settings);

            const { ok, data, error } = await generateContent({
                apiKey,
                userPrompt: prompt,
                settings, // Use the settings with num_results from sidebar
                marketingData,
                smsData,
                sessionId // Ensure sessionId is sent for WebSocket streaming
            });

            // Remove the "Generating..." message - ONLY if it was created
            thinkingMessage?.remove(); // Safe to call even if null

            apiResultOk = ok;
            if (ok) {
                apiData = data;
                
                // For email mode, display the result with character count
                if (mode === 'email') {
                    const resultWithCount = `${data} <sup style="font-size:0.8em;color:#888;">${data.length} chars</sup>`;
                    addMessageToChat('ai', resultWithCount, false, { asHtml: true });
                    
                    // Remove request summary messages when email generation is complete
                    const targetChatDisplay = getEmailChatDisplay();
                    if (targetChatDisplay) {
                        removeRequestSummaryMessages(targetChatDisplay);
                    }
                }
                // For SMS mode, results are handled via WebSocket
            } else {
                // Handle specific errors like 401/403 if needed
                if (error?.includes('401') || error?.includes('Unauthorized')) {
                    addMessageToChat('ai', `Error: Invalid or unauthorized API Key. Please refresh or re-enter.`);
                    localStorage.removeItem(LOCALSTORAGE_API_KEY_NAME);
                    showApiKeyModal();
                } else if (error?.includes('403') || error?.includes('Forbidden')) {
                    addMessageToChat('ai', `Error: Access Denied. Ensure you are using an allowed connection.`);
                } else if (error?.includes('Rate limit exceeded')) {
                    // Handle rate limit from backend
                    const waitTimeMatch = error.match(/wait (\d+) seconds/);
                    const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 120;
                    showRateLimitWarning(waitTime);
                } else {
                    addMessageToChat('ai', `Error: ${error || 'Unknown error during generation.'}`);
                }
                return;
            }

        } catch (err) {
            thinkingMessage?.remove(); // Ensure spinner removed on network error too - safe if null
            console.error('Error calling generateContent:', err);
            
            // Check if it's a rate limit error from the network response
            if (err.message?.includes('429') || err.message?.includes('Rate limit')) {
                showRateLimitWarning(120); // Default 2 minute wait
            } else {
                addMessageToChat('ai', `Error: Network error or issue sending request. (${err.message || err})`);
            }
        } finally {
            // Update summary status
            if (summaryMessageElement) {
                let resultsCount = null;
                if (apiResultOk && apiData) {
                    if (Array.isArray(apiData)) {
                        resultsCount = apiData.length;
                    } else if (typeof apiData === 'object' && apiData !== null) {
                        resultsCount = 1;
                    }
                }
                updateChatMessageStatus(summaryMessageElement, resultsCount, !apiResultOk);
            }

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

    if (clearProjectButton) clearProjectButton.addEventListener('click', () => { clearProject(); saveStateToLocalStorage(); });
    if (clearSmsHistoryButton) clearSmsHistoryButton.addEventListener('click', () => {
        clearHistory('sms'); // Clears display
        clearMessageHistoryCache('sms'); // Clears cache
        saveStateToLocalStorage(); // Save cleared display state (though it's empty now)
    });
    if (clearEmailHistoryButton) clearEmailHistoryButton.addEventListener('click', () => {
        clearHistory('email'); // Clears display
        clearMessageHistoryCache('email'); // Clears cache
        saveStateToLocalStorage(); // Save cleared display state
    });
    if (clearSettingsButton) clearSettingsButton.addEventListener('click', () => { clearSettings(); saveStateToLocalStorage(); }); // clearSettings handles glow update
    if (clearFilesButton) clearFilesButton.addEventListener('click', () => { clearFiles(); saveStateToLocalStorage(); });

    // --- Download Button Listeners ---
    const downloadSmsHistoryButton = document.getElementById('download-sms-history-button');
    const downloadEmailHistoryButton = document.getElementById('download-email-history-button');

    if (downloadSmsHistoryButton) downloadSmsHistoryButton.addEventListener('click', () => downloadAiHistory('sms'));
    if (downloadEmailHistoryButton) downloadEmailHistoryButton.addEventListener('click', () => downloadAiHistory('email'));

    // --- Message History Button Listeners ---
    const smsHistoryButton = getSmsMessageHistoryButton();
    const emailHistoryButton = getEmailMessageHistoryButton();

    function handleHistoryButtonClick(event) {
        const button = event.target;
        const mode = button.id.includes('sms') ? 'sms' : 'email';

        if (button.textContent.includes('Clear')) {
            // Action: Clear History
            clearHistory(mode); // Clear display
            clearMessageHistoryCache(mode); // Clear cache
            // Button state is reset by updateHistoryButtonVisibility called within clearMessageHistoryCache
            addMessageToChat('ai', `Chat display and message cache cleared for ${mode.toUpperCase()}.`);
        } else {
            // Action: Show History
            const history = loadMessageHistory(mode);
            displayHistoryMessages(mode, history);
            // Hide the button after displaying history
            button.classList.add('d-none');
            // No need to toggle state to "Clear" anymore as it's hidden
            // button.textContent = 'Clear Message History';
            // button.title = 'Clear Display & Cache';
            // button.classList.remove('btn-outline-info');
            // button.classList.add('btn-danger');
        }
    }

    if (smsHistoryButton) smsHistoryButton.addEventListener('click', handleHistoryButtonClick);
    if (emailHistoryButton) emailHistoryButton.addEventListener('click', handleHistoryButtonClick);

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
         });
     }

    // Add event listener for template URL copy button
    const copyTemplateBtn = document.querySelector('.copy-template-btn');
    if (copyTemplateBtn) {
        copyTemplateBtn.addEventListener('click', function() {
            const templateUrl = '>>> https://vbs.com/xxxxx';
            navigator.clipboard.writeText(templateUrl).then(() => {
                const originalIcon = this.innerHTML;
                this.innerHTML = getCheckIconSVG();
                this.classList.add('copied');
                this.disabled = true;
                this.title = 'Copied!';
                setTimeout(() => {
                    this.innerHTML = originalIcon;
                    this.classList.remove('copied');
                    this.disabled = false;
                    this.title = 'Copy template URL';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy template URL: ', err);
                this.title = 'Copy failed!';
                setTimeout(() => { this.title = 'Copy template URL'; }, 2000);
            });
        });
    }

    console.log("App initialized.");
});