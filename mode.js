// sms-generator-frontend/mode.js
// Handles mode switching (SMS/Email), UI updates, and state management related to modes.

import { autoResizeTextarea } from './utils.js'; // Assuming utils.js exists or will be created for shared functions
import { updateAllSettingsGlows, storeDefaultSettings } from './settings.js'; // Need these for UI updates on mode switch
import { addWelcomeMessage } from './chat.js'; // Import the welcome message function

// --- Constants ---
const LS_MODE_KEY = 'smsGenMode';
const LS_HISTORY_KEY_PREFIX = 'smsGenHistory_'; // smsGenHistory_sms, smsGenHistory_email
const LS_USER_INPUT_KEY_PREFIX = 'smsGenUserInput_'; // smsGenUserInput_sms, smsGenUserInput_email

// --- State ---
let currentMode = 'sms'; // Default mode
let dependencies = {}; // To hold functions/elements passed from main.js

// --- DOM Elements (Cached) ---
let smsChatArea, emailChatArea, smsChatDisplay, emailChatDisplay, smsUserInput, emailUserInput;
let modeSmsRadio, modeEmailRadio, projectSelect;

/**
 * Initializes the mode module, caches DOM elements, and sets the initial mode.
 * @param {object} config - Configuration object with dependencies.
 * @param {function} config.saveState - Function to trigger saving state to localStorage.
 * @param {function} config.addMessage - Function to add a message to the chat.
 */
export function initializeMode(config) {
    dependencies.saveState = config.saveState;
    dependencies.addMessage = config.addMessage;

    // Cache DOM elements
    smsChatArea = document.getElementById('sms-chat-area');
    emailChatArea = document.getElementById('email-chat-area');
    smsChatDisplay = document.getElementById('sms-chat-display');
    emailChatDisplay = document.getElementById('email-chat-display');
    smsUserInput = document.getElementById('sms-user-input');
    emailUserInput = document.getElementById('email-user-input');
    modeSmsRadio = document.getElementById('mode-sms');
    modeEmailRadio = document.getElementById('mode-email');
    projectSelect = document.getElementById('project');

    if (!smsChatArea || !emailChatArea || !smsChatDisplay || !emailChatDisplay || !smsUserInput || !emailUserInput || !modeSmsRadio || !modeEmailRadio || !projectSelect) {
        console.error("Mode Initialization Error: One or more required DOM elements not found.");
        // Optionally, inform the user via UI
        dependencies.addMessage?.('ai', 'Error: Critical UI elements for mode switching are missing. Please reload.');
        return;
    }

    // Load initial mode from localStorage
    const savedMode = localStorage.getItem(LS_MODE_KEY);
    currentMode = savedMode || 'sms'; // Default to 'sms'

    // Set initial UI state based on loaded mode
    updateUiForMode(currentMode, false); // false = don't save state yet

    // Add event listeners for mode switching
    modeSmsRadio.addEventListener('change', () => handleModeChange('sms'));
    modeEmailRadio.addEventListener('change', () => handleModeChange('email'));

    // Project change listener removed (no dynamic header)

    console.log(`Mode module initialized. Current mode: ${currentMode}`);
}

/**
 * Returns the currently active mode ('sms' or 'email').
 * @returns {string} The current mode.
 */
export function getCurrentMode() {
    return currentMode;
}

/**
 * Handles the logic for switching between SMS and Email modes.
 * @param {string} newMode - The mode to switch to ('sms' or 'email').
 */
export function handleModeChange(newMode) {
    if (newMode === currentMode || !dependencies.saveState) return;

    console.log(`Switching mode from ${currentMode} to ${newMode}`);

    // --- Save current state BEFORE switching ---
    // This relies on the saveState function provided during initialization,
    // which should handle gathering data from chat, input, etc.
    // We save the state associated with the *old* mode.
    const oldHistoryKey = `${LS_HISTORY_KEY_PREFIX}${currentMode}`;
    const oldUserInputKey = `${LS_USER_INPUT_KEY_PREFIX}${currentMode}`;
    const currentChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
    const currentUserInput = currentMode === 'sms' ? smsUserInput : emailUserInput;

    // It might be cleaner if saveState handled these keys directly,
    // but mirroring the old logic for now:
    // if (currentChatDisplay) localStorage.setItem(oldHistoryKey, currentChatDisplay.innerHTML); // REMOVED - History handled by cache
    if (currentUserInput) localStorage.setItem(oldUserInputKey, currentUserInput.value); // Still save input value
    // Also trigger the main saveState function for other potential state (like settings)
    dependencies.saveState();
    // --- End Save ---

    // Update current mode
    currentMode = newMode;

    // Update UI elements
    updateUiForMode(currentMode, true); // true = save the new mode state

    // Update settings UI (glows depend on visible fields)
    storeDefaultSettings(); // Recalculate defaults for the new mode
    updateAllSettingsGlows(); // Update glows based on new mode's visible fields

    console.log(`Mode switched to ${currentMode}. State loaded/saved.`);
}

/**
 * Updates the UI elements (visibility, classes, loaded state) based on the selected mode.
 * @param {string} mode - The mode ('sms' or 'email') to activate.
 * @param {boolean} saveNewModeState - Whether to save the new mode to localStorage.
 */
function updateUiForMode(mode, saveNewModeState) {
    if (!smsChatArea || !emailChatArea || !smsChatDisplay || !emailChatDisplay || !smsUserInput || !emailUserInput) {
        console.error("Cannot update UI for mode: Required elements missing.");
        return;
    }

    // Toggle visibility of chat areas
    if (mode === 'sms') {
        smsChatArea.classList.remove('d-none');
        smsChatArea.classList.add('d-flex');
        emailChatArea.classList.add('d-none');
        emailChatArea.classList.remove('d-flex');
    } else { // email mode
        emailChatArea.classList.remove('d-none');
        emailChatArea.classList.add('d-flex');
        smsChatArea.classList.add('d-none');
        smsChatArea.classList.remove('d-flex');
    }

    // Update body class for CSS targeting (settings visibility, etc.)
    document.body.classList.remove('mode-sms-active', 'mode-email-active');
    document.body.classList.add(`mode-${mode}-active`);

    // --- Load new mode's state ---
    const newHistoryKey = `${LS_HISTORY_KEY_PREFIX}${mode}`;
    const newUserInputKey = `${LS_USER_INPUT_KEY_PREFIX}${mode}`;
    const newChatDisplay = mode === 'sms' ? smsChatDisplay : emailChatDisplay;
    const newUserInput = mode === 'sms' ? smsUserInput : emailUserInput;

    // Always clear the display and add welcome message on mode switch
    newChatDisplay.innerHTML = '';
    addWelcomeMessage(newChatDisplay, mode);
    newChatDisplay.scrollTop = 0; // Scroll to top of cleared display

    // Load only the user input for the new mode
    const savedInput = localStorage.getItem(newUserInputKey);
    newUserInput.value = savedInput || '';
    autoResizeTextarea(newUserInput); // Resize loaded input
    // --- End Load ---

    // Update radio button check state (in case loaded from localStorage)
    if (mode === 'sms' && modeSmsRadio) modeSmsRadio.checked = true;
    if (mode === 'email' && modeEmailRadio) modeEmailRadio.checked = true;

    // Dynamic header removed

    // Save the newly activated mode
    if (saveNewModeState) {
        localStorage.setItem(LS_MODE_KEY, mode);
        // Trigger main save state again to capture any other changes triggered by UI update
        dependencies.saveState?.();
    }
}

/**
 * Adds a welcome message to the specified chat display.
 * @param {HTMLElement} displayElement - The chat display element.
 * @param {string} mode - The mode ('sms' or 'email') for the welcome message.
 */


// REMOVED loadInitialModeStates function - Initial loading logic is now primarily in main.js

// Need a place for shared utility functions like autoResizeTextarea
// Let's assume we create a utils.js for this.