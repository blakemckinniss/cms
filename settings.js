// settings.js - Handles settings form, validation, default values, glows, and localStorage persistence for settings.

import { triggerInputEvent } from './utils.js';

// --- Constants ---
const LS_PROJECT_KEY = 'smsGenProject';
const GLOW_CLASS = 'input-active-glow';

// --- Module Scope Variables ---
let settingsForm = null;
let getCurrentMode = () => 'sms'; // Function to get current mode
let defaultSettingsValues = {};   // Stores default values for the *current* mode
let projectSelect = null;
let numResultsInput = null;
let lengthInput = null;
let emojiToggle = null; // Added for dynamic length limit
let saveState = () => {}; // Function to trigger saving state

// --- Configuration ---

/**
 * Configures the settings module with dependencies.
 * @param {object} config
 * @param {function} config.getSettingsForm
 * @param {function} config.getCurrentMode
 * @param {function} config.getProjectSelect
 * @param {function} config.getNumResultsInput
 * @param {function} config.saveState - Function to trigger saving state
 */
export function configureSettings(config) {
    settingsForm = config.getSettingsForm ? config.getSettingsForm() : document.getElementById('settings-form'); // Fallback just in case
    getCurrentMode = config.getCurrentMode || getCurrentMode;
    projectSelect = config.getProjectSelect ? config.getProjectSelect() : document.getElementById('project');
    numResultsInput = config.getNumResultsInput ? config.getNumResultsInput() : document.getElementById('num-results');
    lengthInput = document.getElementById('length');
    emojiToggle = document.getElementById('use-emojis'); // Cache emoji toggle
    saveState = config.saveState || saveState;

    if (!settingsForm || !projectSelect || !numResultsInput) {
        console.error("Settings Configuration Error: Form, project select, or num results input not found.");
    }
}

// --- Default Value Management ---

/**
 * Stores the default values of form elements relevant to the current mode.
 */
export function storeDefaultSettings() {
    if (!settingsForm) return;
    const mode = getCurrentMode();
    console.log("Storing default settings values for mode:", mode);
    defaultSettingsValues = {};
    for (const element of settingsForm.elements) {
        if (element && element.name && (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
            // Check if the element is relevant for the current mode
            if (isElementRelevantForMode(element, mode)) {
                if (element.type === 'checkbox') {
                    defaultSettingsValues[element.name] = element.defaultChecked;
                } else {
                    // Use defaultValue for text inputs/textareas, value for select initial state
                    defaultSettingsValues[element.name] = element.defaultValue !== undefined ? element.defaultValue : element.value;
                }
            }
        }
    }
    console.log("Default settings stored:", defaultSettingsValues);
}

/**
 * Checks if a form element is relevant for the given mode based on CSS classes.
 * @param {HTMLElement} element - The form element.
 * @param {string} mode - 'sms' or 'email'.
 * @returns {boolean} True if the element is relevant, false otherwise.
 */
function isElementRelevantForMode(element, mode) {
    const isSmsOnly = element.closest('.sms-only') || element.classList.contains('sms-only');
    const isEmailOnly = element.closest('.email-only') || element.classList.contains('email-only');

    if (mode === 'sms') {
        return !isEmailOnly; // Relevant if not email-only
    } else if (mode === 'email') {
        return !isSmsOnly; // Relevant if not sms-only
    }
    return false; // Should not happen
}

// --- Glow Effect ---

/**
 * Updates the glow effect for a single input based on its default value for the current mode.
 * @param {HTMLElement} inputElement
 */
export function updateInputGlow(inputElement) {
    if (!inputElement || !inputElement.name || inputElement.type === 'file' || inputElement.type === 'hidden' || inputElement.tagName === 'BUTTON') return;

    const mode = getCurrentMode();
    // Only apply glow logic if the element is relevant for the current mode
    if (!isElementRelevantForMode(inputElement, mode)) {
        inputElement.classList?.remove(GLOW_CLASS); // Ensure glow is removed if not relevant
        return;
    }

    let isDefault = true;
    const defaultValue = defaultSettingsValues[inputElement.name];

    // If default value wasn't stored for this input in this mode, consider it default
    if (defaultValue === undefined) {
        isDefault = (inputElement.type === 'checkbox' ? !inputElement.checked : !inputElement.value); // Default is unchecked/empty if not stored
    } else if (inputElement.type === 'checkbox') {
        isDefault = (inputElement.checked === defaultValue);
    } else {
        const currentVal = inputElement.value || '';
        const defaultVal = defaultValue || '';
        isDefault = (currentVal === defaultVal);
    }

    if (inputElement.classList) {
        if (!isDefault) {
            inputElement.classList.add(GLOW_CLASS);
        } else {
            inputElement.classList.remove(GLOW_CLASS);
        }
    }
}

/**
 * Updates the glow effect for all relevant settings inputs based on current mode defaults.
 */
export function updateAllSettingsGlows() {
    if (!settingsForm) return;
    console.log("Updating glows for all settings inputs based on defaults for mode:", getCurrentMode());
    for (const element of settingsForm.elements) {
        if (element) {
            updateInputGlow(element);
        }
    }
}

// --- Get Settings ---

/**
 * Gathers active settings based on the current mode and glow state.
 * @returns {object} The settings object to be sent to the backend.
 */
export function getSettings() {
    if (!settingsForm || !projectSelect || !numResultsInput) {
        console.error("Cannot get settings: Form or critical elements missing.");
        return { mode: getCurrentMode(), project: '', num_results: 1, use_emojis: true }; // Return safe defaults
    }

    const formData = new FormData(settingsForm);
    const settings = {};
    const mode = getCurrentMode();
    settings.mode = mode;

    for (const [key, value] of formData.entries()) {
        if (key === 'marketing_file' || key === 'sms_file' || key === 'modal_api_key_input' || key === 'mode') continue;

        const potentialElementOrList = settingsForm.elements[key];
        if (!potentialElementOrList) continue;

        // Handle NodeList/RadioNodeList (e.g., radio buttons) by checking the first element
        const element = (potentialElementOrList instanceof NodeList || potentialElementOrList instanceof RadioNodeList)
            ? potentialElementOrList[0]
            : potentialElementOrList;

        // Ensure we have a valid element to check
        if (!element || typeof element.closest !== 'function') continue;

        // Only include settings relevant to the current mode AND are actively set (glowing)
        if (isElementRelevantForMode(element, mode)) {
            const isGlowing = element.classList?.contains(GLOW_CLASS);
            const actualElement = (potentialElementOrList instanceof NodeList || potentialElementOrList instanceof RadioNodeList)
                ? settingsForm.elements[key].value // For RadioNodeList, get the checked value directly
                : element; // Use the single element otherwise

            if (actualElement.type === 'checkbox') {
                // Include checkbox if it's glowing (different from default) OR if it matches the default state
                const defaultValue = defaultSettingsValues[key];
                 // Check the actual element's checked state
                if (isGlowing || (actualElement.checked === defaultValue)) {
                     settings[key] = actualElement.checked;
                }
            } else if (actualElement.type === 'radio') {
                 // For radio buttons, the value from formData is the one we need if relevant
                 settings[key] = value;
            }
             else if (isGlowing && value && value.trim() !== '') {
                // Include other inputs only if glowing and have a non-empty value
                settings[key] = value;
            }
        }
    }

    // Always include project
    settings.project = projectSelect.value;

    // Handle num_results separately - always include its current value, validated
    let numRes = parseInt(numResultsInput.value, 10);
    settings.num_results = (!isNaN(numRes) && numRes >= 1) ? numRes : 1;
    // If num_results input itself isn't glowing, but we included it, ensure it's not overriding prompt if empty
    // (This logic might need refinement based on desired priority)

    // Handle use_emojis default if not explicitly included by the logic above
    if (settings.use_emojis === undefined) {
        const emojiCheckbox = settingsForm.elements['use_emojis'];
        // Default to true if checkbox doesn't exist, otherwise use its current state
        settings.use_emojis = emojiCheckbox ? emojiCheckbox.checked : true;
    }

    console.log("Gathered settings for backend:", settings);
    return settings;
}

// --- Clear Functions ---

/**
 * Clears all settings inputs, resets glows, and saves state.
 */
export function clearSettings() {
    if (!settingsForm) return;
    settingsForm.reset(); // Resets form elements to their HTML defaults
    console.log('Settings form reset.');
    // After reset, defaults might be different from stored ones if HTML defaults changed
    // So, re-store defaults based on the *current* state after reset
    storeDefaultSettings();
    // Update glows based on the now-default values
    updateAllSettingsGlows();
    // Trigger state saving
    saveState();
}

/**
 * Handles click events for individual setting clear buttons.
 * @param {Event} event - The click event.
 */
function handleClearInputButtonClick(event) {
    const clearButton = event.target.closest('.clear-input-btn');
    if (!clearButton || !settingsForm) return;

    const targetInputId = clearButton.dataset.targetInput;
    if (!targetInputId) {
        console.warn('Clear button clicked, but no target input ID found.');
        return;
    }

    const targetInput = settingsForm.elements[targetInputId];
    if (!targetInput) {
        console.warn(`Clear button clicked, but target input '#${targetInputId}' not found.`);
        return;
    }

    const inputName = targetInput.name;
    if (!inputName || defaultSettingsValues[inputName] === undefined) {
        console.warn(`Could not find default value for input '${inputName}'. Cannot reset.`);
        // Fallback: just clear it
        if (targetInput.type === 'checkbox') targetInput.checked = false;
        else targetInput.value = '';
    } else {
        const defaultValue = defaultSettingsValues[inputName];
        if (targetInput.type === 'checkbox') {
            targetInput.checked = defaultValue;
        } else {
            targetInput.value = defaultValue;
        }
    }

    // Trigger input event to update glow and potentially other listeners
    triggerInputEvent(targetInput);
    // Save state after clearing
    saveState();
    console.log(`Input '${inputName}' reset to default value.`);
}

// --- Input Validation ---

function handleNumericInput(event) {
    const originalValue = event.target.value;
    const numericValue = originalValue.replace(/\D/g, '');
    if (originalValue !== numericValue) {
        event.target.value = numericValue;
        // Optionally trigger input event if validation changes value
        // triggerInputEvent(event.target);
    }
}

// --- Dynamic Length Limit ---

/**
 * Updates the max attribute and placeholder of the length input based on the emoji toggle.
 * Also clamps the current value if it exceeds the new maximum.
 */
function updateLengthInputLimits() {
    if (!lengthInput || !emojiToggle) return;

    const useEmojis = emojiToggle.checked;
    const newMax = useEmojis ? 44 : 134;
    const newPlaceholder = useEmojis ? 'e.g., 44' : 'e.g., 134';

    lengthInput.max = newMax;
    lengthInput.placeholder = newPlaceholder;

    // Clamp current value if it exceeds the new max
    let currentValue = parseInt(lengthInput.value, 10);
    if (!isNaN(currentValue) && currentValue > newMax) {
        lengthInput.value = newMax;
        triggerInputEvent(lengthInput); // Update glow and save state via main listener
    }
    console.log(`Length input max set to ${newMax}, placeholder to "${newPlaceholder}"`);
}


function handleLengthBlur(event) {
    const input = event.target;
    const max = parseInt(input.max, 10) || 134; // Use current max attribute or fallback
    let value = parseInt(input.value, 10);

    // Reset to max if invalid, empty, or over max
    if (isNaN(value) || value <= 0 || value > max) {
         // If invalid or zero, set to max. If valid but over max, it's already handled by updateLengthInputLimits on change.
         // Let's just ensure it's not empty or invalid on blur. If it is, set to max.
         if (isNaN(value) || value <= 0) {
            input.value = max; // Set to current max if invalid/empty on blur
            triggerInputEvent(input); // Update glow
            saveState(); // Save change
         }
    }
}


function handleNumResultsBlur(event) {
    const input = event.target;
    const min = parseInt(input.min, 10) || 1;
    const max = parseInt(input.max, 10) || 20;
    let value = parseInt(input.value, 10);
    // Reset to default if invalid or out of range
    if (isNaN(value) || value < min || value > max) {
        const defaultValue = defaultSettingsValues[input.name] || '1'; // Use stored default or fallback
        input.value = defaultValue;
        triggerInputEvent(input); // Update glow
        saveState(); // Save change
    }
}

// --- Initialization ---

/**
 * Initializes the settings module: sets up listeners, stores defaults, applies glows.
 */
export function initializeSettings() {
    if (!settingsForm) {
        console.error("Settings Initialization failed: Form element not found.");
        return;
    }

    // Load initial project selection
    const savedProject = localStorage.getItem(LS_PROJECT_KEY);
    if (savedProject && projectSelect) {
        projectSelect.value = savedProject;
    }

    // Store initial default values based on current mode (which should be set by mode.js first)
    storeDefaultSettings();
    // Set initial length limits based on default emoji state
    updateLengthInputLimits();
    // Apply initial glow effects
    updateAllSettingsGlows();

    // --- Event Listeners ---

    // Update glow and save state on any input change
    settingsForm.addEventListener('input', (event) => {
        if (event.target && event.target.matches('input, textarea, select')) {
            updateInputGlow(event.target);
            saveState(); // Trigger debounced save
        }
    });

    // Handle clicks for individual clear buttons using delegation
    settingsForm.addEventListener('click', handleClearInputButtonClick);

    // Input validation listeners
    if (lengthInput) {
        lengthInput.addEventListener('input', handleNumericInput);
        lengthInput.addEventListener('blur', handleLengthBlur);
    }
    if (numResultsInput) {
        numResultsInput.addEventListener('input', handleNumericInput);
        numResultsInput.addEventListener('blur', handleNumResultsBlur);
    }
    if (emojiToggle) {
        emojiToggle.addEventListener('change', updateLengthInputLimits);
    }

    console.log("Settings module initialized.");
}

// Function to clear project selection (called from main.js)
export function clearProject() {
    if (projectSelect) {
        projectSelect.selectedIndex = 0; // Reset to the first option
        console.log('Project selection cleared.');
        // Saving state and updating header is handled in main.js
    }
}