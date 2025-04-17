// sms-generator-frontend/mode.js
// Handles mode switching (SMS/Email), UI updates, and state management related to modes.

import { autoResizeTextarea } from './utils.js'; // Assuming utils.js exists or will be created for shared functions
import { updateAllSettingsGlows, storeDefaultSettings } from './settings.js'; // Need these for UI updates on mode switch

// --- Constants ---
const LS_MODE_KEY = 'smsGenMode';
const LS_HISTORY_KEY_PREFIX = 'smsGenHistory_'; // smsGenHistory_sms, smsGenHistory_email
const LS_USER_INPUT_KEY_PREFIX = 'smsGenUserInput_'; // smsGenUserInput_sms, smsGenUserInput_email

// --- State ---
let currentMode = 'sms'; // Default mode
let dependencies = {}; // To hold functions/elements passed from main.js

// --- DOM Elements (Cached) ---
let smsChatArea, emailChatArea, smsChatDisplay, emailChatDisplay, smsUserInput, emailUserInput;
let modeSmsRadio, modeEmailRadio, projectSelect, dynamicHeader;

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
    dynamicHeader = document.getElementById('dynamic-header');

    if (!smsChatArea || !emailChatArea || !smsChatDisplay || !emailChatDisplay || !smsUserInput || !emailUserInput || !modeSmsRadio || !modeEmailRadio || !projectSelect || !dynamicHeader) {
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

    // Add listener for project changes to update header
    projectSelect.addEventListener('change', updateDynamicHeader);

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
    if (currentChatDisplay) localStorage.setItem(oldHistoryKey, currentChatDisplay.innerHTML);
    if (currentUserInput) localStorage.setItem(oldUserInputKey, currentUserInput.value);
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

    const savedHistory = localStorage.getItem(newHistoryKey);
    if (savedHistory) {
        newChatDisplay.innerHTML = savedHistory;
    } else {
        newChatDisplay.innerHTML = ''; // Clear if no history
        addWelcomeMessage(newChatDisplay, mode); // Add welcome message
    }
    // Ensure scroll to bottom after loading history
    newChatDisplay.scrollTop = newChatDisplay.scrollHeight;

    const savedInput = localStorage.getItem(newUserInputKey);
    newUserInput.value = savedInput || '';
    autoResizeTextarea(newUserInput); // Resize loaded input
    // --- End Load ---

    // Update radio button check state (in case loaded from localStorage)
    if (mode === 'sms' && modeSmsRadio) modeSmsRadio.checked = true;
    if (mode === 'email' && modeEmailRadio) modeEmailRadio.checked = true;

    // Update the dynamic header
    updateDynamicHeader();

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
function addWelcomeMessage(displayElement, mode) {
    if (!displayElement) return;
    const welcomeDiv = document.createElement('div');
    welcomeDiv.classList.add('message', 'ai', 'alert', 'alert-info');
    welcomeDiv.setAttribute('role', 'alert');
    welcomeDiv.textContent = `Welcome to ${mode === 'sms' ? 'SMS' : 'Email'} mode! Select a project and type your request below, or use the settings on the right.`;
    displayElement.appendChild(welcomeDiv);
}

/**
 * Updates the dynamic header text based on the current mode and project.
 */
export function updateDynamicHeader() {
    if (!dynamicHeader || !projectSelect) return; // Safety check
    const modeText = currentMode.toUpperCase();
    const projectValue = projectSelect.value;
    let projectAbbreviation = projectValue; // Default to full name if no match

    // Consider making this mapping data-driven or configurable if projects change often
    const projectAbbreviations = {
        "Bahama Breeze": "BB",
        "Cheddars": "CSK", // Assuming 'Cheddars' is the value in the select
        "Yardhouse": "YH"  // Assuming 'Yardhouse' is the value
    };
    projectAbbreviation = projectAbbreviations[projectValue] || projectValue;

    dynamicHeader.textContent = `${modeText} Mode - ${projectAbbreviation}`;
}

/**
 * Loads chat history and user input for both modes on initial page load.
 * This ensures that switching modes immediately shows the correct saved state.
 */
export function loadInitialModeStates() {
    ['sms', 'email'].forEach(mode => {
        const historyKey = `${LS_HISTORY_KEY_PREFIX}${mode}`;
        const userInputKey = `${LS_USER_INPUT_KEY_PREFIX}${mode}`;
        const chatDisplay = mode === 'sms' ? smsChatDisplay : emailChatDisplay;
        const userInput = mode === 'sms' ? smsUserInput : emailUserInput;

        if (!chatDisplay || !userInput) {
            console.warn(`Cannot load initial state for ${mode}: Elements missing.`);
            return;
        }

        const savedHistory = localStorage.getItem(historyKey);
        if (savedHistory) {
            chatDisplay.innerHTML = savedHistory;
        } else {
            chatDisplay.innerHTML = ''; // Clear if no history
            addWelcomeMessage(chatDisplay, mode); // Add welcome message
        }
        chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to bottom

        const savedInput = localStorage.getItem(userInputKey);
        userInput.value = savedInput || '';
        autoResizeTextarea(userInput); // Resize loaded input
    });
    console.log('Initial states for both modes loaded.');
}

// Need a place for shared utility functions like autoResizeTextarea
// Let's assume we create a utils.js for this.