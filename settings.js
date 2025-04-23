// settings.js - Handles settings form, validation, default values, glows, and localStorage persistence for settings.

import { triggerInputEvent } from './utils.js';

// --- Constants ---
const LS_PROJECT_KEY = 'smsGenProject';
const GLOW_CLASS = 'input-active-glow';

// Advanced Settings LocalStorage Keys & Defaults
const LS_ADV_SETTINGS_PREFIX = 'advOpt_';
const ADV_SETTINGS_CONFIG = {
    temperature: { lsKey: `${LS_ADV_SETTINGS_PREFIX}temperature`, default: 0.8, elementId: 'adv-temperature', valueId: 'adv-temperature-value' },
    top_p: { lsKey: `${LS_ADV_SETTINGS_PREFIX}top_p`, default: 0.7, elementId: 'adv-top-p', valueId: 'adv-top-p-value' },
    frequency_penalty: { lsKey: `${LS_ADV_SETTINGS_PREFIX}frequency_penalty`, default: 0.0, elementId: 'adv-frequency-penalty', valueId: 'adv-frequency-penalty-value' },
    presence_penalty: { lsKey: `${LS_ADV_SETTINGS_PREFIX}presence_penalty`, default: 0.0, elementId: 'adv-presence-penalty', valueId: 'adv-presence-penalty-value' },
};


// --- Module Scope Variables ---
let settingsForm = null;
let getCurrentMode = () => 'sms'; // Function to get current mode
let defaultSettingsValues = {};   // Stores default values for the *current* mode
let projectSelect = null;
let numResultsInput = null;
let lengthInput = null;
let emojiToggle = null; // Added for dynamic length limit
let topicSelect = null; // NEW: Topic dropdown
let topicCustom = null; // NEW: Custom topic input
let topicDescription = null; // NEW: Topic description display
let toneSelect = null; // NEW: Tone dropdown (reusing existing ID 'tone')
let toneDescription = null; // NEW: Tone description display
let saveState = () => {}; // Function to trigger saving state
let advancedOptionsModalInstance = null; // Bootstrap Modal instance

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
    topicSelect = document.getElementById('topic-select'); // NEW
    topicCustom = document.getElementById('topic-custom'); // NEW
    topicDescription = document.getElementById('topic-description'); // NEW
    toneSelect = document.getElementById('tone'); // NEW - Get tone select
    toneDescription = document.getElementById('tone-description'); // NEW - Get tone description div
    saveState = config.saveState || saveState;

    if (!settingsForm || !projectSelect || !numResultsInput || !topicSelect || !topicCustom || !topicDescription || !toneSelect || !toneDescription) {
        console.error("Settings Configuration Error: Form, project select, num results, topic select/custom/description, or tone select/description input not found.");
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
                    // For topic-select, the default is the first option's value ("")
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

    // Special handling for custom topic input glow
    if (inputElement.id === 'topic-custom') {
        const isOtherSelected = topicSelect && topicSelect.value === 'other';
        // Only consider it "not default" (and thus glowing) if 'Other' is selected AND it has a value
        isDefault = !(isOtherSelected && currentVal !== '');
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
 * Gathers active settings based on the current mode and glow state, including advanced options.
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

    // --- Standard Settings ---
    // Clear potential topic values from formData initially, we'll handle it manually
    formData.delete('topic_select');
    formData.delete('topic_custom');

    for (const [key, value] of formData.entries()) {
        // Skip file inputs, modal key, mode, and topic inputs (handled manually)
        if (key === 'marketing_file' || key === 'sms_file' || key === 'modal_api_key_input' || key === 'mode' || key.startsWith('topic_')) continue;

        const potentialElementOrList = settingsForm.elements[key];
        if (!potentialElementOrList) continue;

        const element = (potentialElementOrList instanceof NodeList || potentialElementOrList instanceof RadioNodeList)
            ? potentialElementOrList[0]
            : potentialElementOrList;

        if (!element || typeof element.closest !== 'function') continue;

        if (isElementRelevantForMode(element, mode)) {
            const isGlowing = element.classList?.contains(GLOW_CLASS);
            const actualElement = (potentialElementOrList instanceof NodeList || potentialElementOrList instanceof RadioNodeList)
                ? settingsForm.elements[key].value // For RadioNodeList, get the checked value directly
                : element;

            if (actualElement.type === 'checkbox') {
                const defaultValue = defaultSettingsValues[key];
                if (isGlowing || (actualElement.checked === defaultValue)) {
                    settings[key] = actualElement.checked;
                }
            } else if (actualElement.type === 'radio') {
                settings[key] = value;
            } else if (isGlowing && value && value.trim() !== '') {
                settings[key] = value;
            }
        }
    }

    // --- Manual Topic Handling ---
    let finalTopic = '';
    if (topicSelect && topicCustom) {
        const selectedTopicValue = topicSelect.value;
        if (selectedTopicValue === 'other') {
            // Use custom input only if 'Other' is selected AND the custom input has a value AND it's glowing
            if (topicCustom.value.trim() !== '' && topicCustom.classList.contains(GLOW_CLASS)) {
                finalTopic = topicCustom.value.trim();
            }
        } else if (selectedTopicValue !== '') {
            // Use dropdown value if it's not 'Other', not empty, AND it's glowing
            if (topicSelect.classList.contains(GLOW_CLASS)) {
                finalTopic = selectedTopicValue;
            }
        }
    }
    if (finalTopic) {
        settings.topic = finalTopic; // Add 'topic' key only if a valid topic is determined
    }
    // --- End Manual Topic Handling ---

    settings.project = projectSelect.value;
    let numRes = parseInt(numResultsInput.value, 10);
    settings.num_results = (!isNaN(numRes) && numRes >= 1) ? numRes : 1;

    if (settings.use_emojis === undefined) {
        const emojiCheckbox = settingsForm.elements['use_emojis'];
        settings.use_emojis = emojiCheckbox ? emojiCheckbox.checked : true;
    }

    // --- Advanced Settings ---
    for (const paramName in ADV_SETTINGS_CONFIG) {
        const config = ADV_SETTINGS_CONFIG[paramName];
        const savedValueStr = localStorage.getItem(config.lsKey);
        if (savedValueStr !== null) {
            const savedValue = parseFloat(savedValueStr);
            // Include if the saved value is different from the default
            // Or just always include if saved? Let's always include if saved.
            settings[paramName] = savedValue;
            console.log(`Including advanced setting: ${paramName}=${savedValue}`);
        }
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
    // Manually handle topic description/custom visibility after reset
    handleTopicChange();
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

    // Special handling for clearing topic
    if (targetInputId === 'topic-select') {
        if (topicCustom) {
            topicCustom.value = ''; // Clear custom input as well
            topicCustom.classList.remove(GLOW_CLASS); // Remove glow from custom
            topicCustom.classList.add('d-none'); // Hide custom
        }
        if (topicDescription) {
            topicDescription.textContent = ''; // Clear description
        }
        // Trigger event for custom input too, if it exists
        if (topicCustom) triggerInputEvent(topicCustom);
    }

    // Special handling for clearing tone
    if (targetInputId === 'tone') {
        if (toneDescription) {
            toneDescription.textContent = ''; // Clear description
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
    const newMax = useEmojis ? 40 : 134;
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

// --- Advanced Options Modal Logic ---

/**
 * Updates the value display for an advanced setting slider.
 * @param {HTMLInputElement} sliderElement
 * @param {HTMLSpanElement} valueElement
 */
function updateAdvancedSliderValueDisplay(sliderElement, valueElement) {
    if (sliderElement && valueElement) {
        const value = parseFloat(sliderElement.value).toFixed(sliderElement.step.includes('.') ? sliderElement.step.split('.')[1].length : 0);
        valueElement.textContent = value;
    }
}

/**
 * Loads advanced settings from localStorage and applies them to the modal inputs.
 */
function loadAdvancedSettings() {
    console.log("Loading advanced settings from localStorage...");
    for (const paramName in ADV_SETTINGS_CONFIG) {
        const config = ADV_SETTINGS_CONFIG[paramName];
        const slider = document.getElementById(config.elementId);
        const valueDisplay = document.getElementById(config.valueId);
        if (slider && valueDisplay) {
            const savedValue = localStorage.getItem(config.lsKey);
            const valueToSet = savedValue !== null ? parseFloat(savedValue) : config.default;
            slider.value = valueToSet;
            updateAdvancedSliderValueDisplay(slider, valueDisplay);
            console.log(`Loaded ${paramName}: ${valueToSet} (Saved: ${savedValue})`);
        } else {
            console.warn(`Advanced setting elements not found for: ${paramName}`);
        }
    }
}

/**
 * Saves an advanced setting value to localStorage.
 * @param {string} paramName - The API parameter name (e.g., 'temperature').
 * @param {number} value - The value to save.
 */
function saveAdvancedSetting(paramName, value) {
    const config = ADV_SETTINGS_CONFIG[paramName];
    if (config) {
        localStorage.setItem(config.lsKey, value.toString());
        console.log(`Saved advanced setting: ${paramName}=${value}`);
    }
}

/**
 * Resets advanced settings to their defaults and removes them from localStorage.
 */
function resetAdvancedSettings() {
    console.log("Resetting advanced settings to defaults...");
    for (const paramName in ADV_SETTINGS_CONFIG) {
        const config = ADV_SETTINGS_CONFIG[paramName];
        const slider = document.getElementById(config.elementId);
        const valueDisplay = document.getElementById(config.valueId);
        if (slider && valueDisplay) {
            slider.value = config.default;
            updateAdvancedSliderValueDisplay(slider, valueDisplay);
            localStorage.removeItem(config.lsKey);
            console.log(`Reset ${paramName} to default: ${config.default}`);
        }
    }
    // Optionally trigger saveState() if needed, but likely not required just for reset
}


// --- Topic Hybrid Input Logic ---

/**
 * Handles changes to the topic dropdown selection.
 * Shows/hides the custom input and updates the description text.
 */
function handleTopicChange() {
    if (!topicSelect || !topicCustom || !topicDescription) return;

    const selectedOption = topicSelect.options[topicSelect.selectedIndex];
    const description = selectedOption ? selectedOption.dataset.description || '' : '';
    const isOther = topicSelect.value === 'other';

    // Update description text
    topicDescription.textContent = description;

    // Show/hide custom input and description
    if (isOther) {
        topicCustom.classList.remove('d-none');
        topicDescription.classList.add('d-none'); // Hide description when 'Other' is selected
        // Do not clear topicCustom.value here, let user manage it
    } else {
        topicCustom.classList.add('d-none');
        topicDescription.classList.remove('d-none'); // Show description for non-'Other'
        // Optionally clear topicCustom.value when switching away from 'Other'?
        // topicCustom.value = ''; // Let's not clear it automatically for now.
    }

    // Update glows for both elements
    updateInputGlow(topicSelect);
    updateInputGlow(topicCustom);

    // Save state whenever the dropdown changes
    saveState();
}

// --- Tone Description Logic ---

/**
 * Handles changes to the tone dropdown selection.
 * Updates the description text.
 */
function handleToneChange() {
    if (!toneSelect || !toneDescription) return;

    const selectedOption = toneSelect.options[toneSelect.selectedIndex];
    const description = selectedOption ? selectedOption.dataset.description || '' : '';

    // Update description text
    toneDescription.textContent = description;

    // Update glow for the select element
    updateInputGlow(toneSelect);

    // Save state whenever the dropdown changes
    saveState();
}

// --- Initialization ---

/**
 * Initializes the settings module: sets up listeners, stores defaults, applies glows, handles advanced options modal.
 */
export function initializeSettings() {
    if (!settingsForm) {
        console.error("Settings Initialization failed: Form element not found.");
        return;
    }

    // --- Standard Settings Initialization ---
    const savedProject = localStorage.getItem(LS_PROJECT_KEY);
    if (savedProject && projectSelect) {
        projectSelect.value = savedProject;
    }
    storeDefaultSettings();
    updateLengthInputLimits();
    updateAllSettingsGlows();

    // --- Advanced Options Modal Initialization ---
    const advancedOptionsModalEl = document.getElementById('advanced-options-modal');
    const advancedOptionsButton = document.getElementById('advanced-options-button');
    const resetAdvancedButton = document.getElementById('reset-advanced-options');

    if (advancedOptionsModalEl && advancedOptionsButton && window.bootstrap && window.bootstrap.Modal) {
        advancedOptionsModalInstance = new bootstrap.Modal(advancedOptionsModalEl);

        advancedOptionsButton.addEventListener('click', () => {
            loadAdvancedSettings(); // Load latest saved values when opening
            advancedOptionsModalInstance.show();
        });

        // Add listeners for sliders
        for (const paramName in ADV_SETTINGS_CONFIG) {
            const config = ADV_SETTINGS_CONFIG[paramName];
            const slider = document.getElementById(config.elementId);
            const valueDisplay = document.getElementById(config.valueId);
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    updateAdvancedSliderValueDisplay(slider, valueDisplay);
                    saveAdvancedSetting(paramName, parseFloat(slider.value));
                });
            }
        }

        // Add listener for reset button
        if (resetAdvancedButton) {
            resetAdvancedButton.addEventListener('click', resetAdvancedSettings);
        }

        // Load initial values on page load (in case modal isn't opened first)
        loadAdvancedSettings();

    } else {
        console.warn("Advanced options modal elements or Bootstrap Modal not found. Advanced options disabled.");
        if (advancedOptionsButton) advancedOptionsButton.disabled = true; // Disable button if modal won't work
    }


    // --- Event Listeners (Standard Settings) ---
    settingsForm.addEventListener('input', (event) => {
        const target = event.target;
        if (target && target.matches('input, textarea, select') && !target.closest('#advanced-options-modal')) { // Exclude modal inputs
            // Standard glow update and save
            updateInputGlow(target);
            saveState(); // Trigger debounced save

            // If the target is the custom topic input, also update the select's glow potentially
            if (target.id === 'topic-custom') {
                updateInputGlow(topicSelect); // Re-evaluate select glow based on custom input change
            }
        }
    });

    settingsForm.addEventListener('click', handleClearInputButtonClick);

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

    // Add listener for topic dropdown change
    if (topicSelect) {
        topicSelect.addEventListener('change', handleTopicChange);
        // Initial call to set state based on loaded value
        handleTopicChange();
    }

    // Add listener for custom topic input to update glows on input
    if (topicCustom) {
        topicCustom.addEventListener('input', () => {
            updateInputGlow(topicCustom);
            // Also potentially update the glow of the select if 'Other' is chosen
            if (topicSelect && topicSelect.value === 'other') {
                updateInputGlow(topicSelect);
            }
            saveState(); // Save on custom input change too
        });
    }

    // Add listener for tone dropdown change
    if (toneSelect) {
        toneSelect.addEventListener('change', handleToneChange);
        // Initial call to set state based on loaded value
        handleToneChange();
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