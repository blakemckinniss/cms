// file.js - Handles file upload and file-related logic

// --- Constants ---
const LS_MARKETING_FILE_STATUS_KEY = 'smsGenMarketingFileStatus';
const LS_SMS_FILE_STATUS_KEY = 'smsGenSmsFileStatus';

// --- Module Scope Variables ---
let marketingData = ""; // In-memory storage for file content
let smsData = "";       // In-memory storage for file content
let marketingFileStatusEl = null; // DOM element for marketing file status
let smsFileStatusEl = null;       // DOM element for SMS file status
let saveState = () => {};         // Function to trigger saving state
let addMessage = () => {};        // Function to add messages to chat

/**
 * Configures the file module with dependencies.
 * @param {object} config
 * @param {function} config.getMarketingFileStatus
 * @param {function} config.getSmsFileStatus
 * @param {function} config.saveState
 * @param {function} config.addMessage
 */
export function configureFileHandlers(config) {
    marketingFileStatusEl = config.getMarketingFileStatus ? config.getMarketingFileStatus() : document.getElementById('marketing-file-status');
    smsFileStatusEl = config.getSmsFileStatus ? config.getSmsFileStatus() : document.getElementById('sms-file-status');
    saveState = config.saveState || saveState;
    addMessage = config.addMessage || addMessage;

    if (!marketingFileStatusEl || !smsFileStatusEl) {
        console.error("File Handler Configuration Error: Status elements not found.");
    }
}

export function getMarketingData() {
    return marketingData;
}

export function getSmsData() {
    return smsData;
}

/**
 * Handles the file input change event. Reads the file, updates status, stores data.
 * @param {Event} event - The file input change event.
 * @param {'marketing' | 'sms'} type - The type of file being uploaded.
 */
export function handleFileUpload(event, type) {
    const file = event.target.files[0];
    const statusElement = type === 'marketing' ? marketingFileStatusEl : smsFileStatusEl;

    if (!statusElement) {
        console.error(`Cannot handle file upload: Status element for type '${type}' not found.`);
        return;
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (type === 'marketing') {
                marketingData = content;
                console.log(`Marketing data loaded (${(content.length / 1024).toFixed(2)} KB).`);
            } else {
                smsData = content;
                console.log(`SMS data loaded (${(content.length / 1024).toFixed(2)} KB).`);
            }
            statusElement.textContent = `Loaded: ${file.name}`;
            statusElement.className = 'file-status small text-muted loaded';
            saveState(); // Trigger state save
        };
        reader.onerror = (e) => {
            console.error("File reading error:", e);
            if (type === 'marketing') marketingData = ""; else smsData = "";
            statusElement.textContent = `Error reading ${file.name}`;
            statusElement.className = 'file-status small text-danger error';
            addMessage('ai', `Error: Error reading file ${file.name}`);
            saveState(); // Trigger state save
        };
        reader.readAsText(file); // Consider adding size limits or other checks here
    } else {
        if (type === 'marketing') marketingData = ""; else smsData = "";
        statusElement.textContent = "No file selected";
        statusElement.className = 'file-status small text-muted';
        saveState(); // Trigger state save
    }
}

/**
 * Clears file inputs, resets status messages, clears stored data, and saves state.
 */
export function clearFiles() {
    const marketingInput = document.getElementById('marketing-file');
    const smsInput = document.getElementById('sms-file');

    if (marketingInput) marketingInput.value = ''; // Clear the actual input element value
    if (smsInput) smsInput.value = '';       // Clear the actual input element value

    marketingData = "";
    smsData = "";

    // Reset status text and class
    if (marketingFileStatusEl) {
        marketingFileStatusEl.textContent = "No file selected";
        marketingFileStatusEl.className = 'file-status small text-muted';
    }
    if (smsFileStatusEl) {
        smsFileStatusEl.textContent = "No file selected";
        smsFileStatusEl.className = 'file-status small text-muted';
    }

    console.log('File selections, data, and UI status cleared.');
    saveState(); // Save the cleared state
}

/**
 * Initializes the file handlers by loading saved status from localStorage.
 */
export function initializeFileHandlers() {
    try {
        const savedMarketingStatus = localStorage.getItem(LS_MARKETING_FILE_STATUS_KEY);
        const savedMarketingStatusClass = localStorage.getItem(LS_MARKETING_FILE_STATUS_KEY + '_class');
        if (savedMarketingStatus && marketingFileStatusEl) {
            marketingFileStatusEl.textContent = savedMarketingStatus;
            marketingFileStatusEl.className = savedMarketingStatusClass || 'file-status small text-muted';
        }

        const savedSmsStatus = localStorage.getItem(LS_SMS_FILE_STATUS_KEY);
        const savedSmsStatusClass = localStorage.getItem(LS_SMS_FILE_STATUS_KEY + '_class');
        if (savedSmsStatus && smsFileStatusEl) {
            smsFileStatusEl.textContent = savedSmsStatus;
            smsFileStatusEl.className = savedSmsStatusClass || 'file-status small text-muted';
        }

        // Reset in-memory data on load, user must re-upload if needed
        marketingData = "";
        smsData = "";

        console.log('File handler state loaded from localStorage.');
    } catch (error) {
        console.error('Error loading file handler state from localStorage:', error);
        addMessage('ai', 'Warning: Could not load saved file statuses.');
        // Clear potentially corrupted keys
        localStorage.removeItem(LS_MARKETING_FILE_STATUS_KEY);
        localStorage.removeItem(LS_MARKETING_FILE_STATUS_KEY + '_class');
        localStorage.removeItem(LS_SMS_FILE_STATUS_KEY);
        localStorage.removeItem(LS_SMS_FILE_STATUS_KEY + '_class');
    }
}