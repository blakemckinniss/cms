// modal.js - Handles API key modal logic

import {
    calculateSecretHash,
    VALIDATE_URL,
    LOCALSTORAGE_API_KEY_NAME,
    FRONTEND_SECRET_SALT_VALUE
} from './api.js';

let apiKeyModal, modalApiKeyInput, validateKeyButton, modalErrorMessage, apiKeyModalElement;
let currentApiKey = null; // This might be redundant if main.js manages the key state solely via localStorage
let addMessage = () => {}; // Placeholder for addMessageToChat dependency

/**
 * Configures the modal module with dependencies.
 * @param {object} config
 * @param {function} config.addMessage - Function to add messages to the chat UI.
 */
export function configureModal(config) {
    addMessage = config.addMessage || addMessage;
}

export function initializeModal() {
    apiKeyModalElement = document.getElementById('api-key-modal');
    modalApiKeyInput = document.getElementById('modal-api-key-input');
    validateKeyButton = document.getElementById('validate-key-button');
    modalErrorMessage = document.getElementById('modal-error-message');
    if (!apiKeyModalElement) return;
    apiKeyModal = new bootstrap.Modal(apiKeyModalElement, {
        backdrop: 'static',
        keyboard: false
    });
}

export function showApiKeyModal() {
    if (!modalErrorMessage || !modalApiKeyInput || !apiKeyModal) return;
    modalErrorMessage.textContent = '';
    modalErrorMessage.style.display = 'none';
    modalApiKeyInput.value = '';
    apiKeyModal.show();
    apiKeyModalElement.addEventListener('shown.bs.modal', () => modalApiKeyInput.focus(), { once: true });
}

function hideApiKeyModal() {
    if (apiKeyModal) apiKeyModal.hide();
}

export function handleModalInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleValidateAndSaveKey();
    }
}

async function handleValidateAndSaveKey() {
    const rawKey = modalApiKeyInput.value.trim();
    if (!rawKey) {
        modalErrorMessage.textContent = 'Please enter an API key.';
        modalErrorMessage.style.display = 'block';
        return;
    }
    const keyToValidate = rawKey.toUpperCase();
    if (keyToValidate === "DEBUG") {
        console.log("DEBUG keyword entered. Hiding modal.");
        hideApiKeyModal();
        return;
    }
    modalErrorMessage.textContent = 'Validating...';
    modalErrorMessage.style.display = 'block';
    validateKeyButton.disabled = true;
    try {
        const secretHash = await calculateSecretHash(keyToValidate, FRONTEND_SECRET_SALT_VALUE);
        if (!secretHash) {
            modalErrorMessage.textContent = 'Configuration error (salt). Cannot validate key.';
            modalErrorMessage.style.display = 'block';
            validateKeyButton.disabled = false;
            return;
        }
        const response = await fetch(VALIDATE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': keyToValidate,
                'X-Frontend-Secret': secretHash
            }
        });
        if (response.ok) {
            localStorage.setItem(LOCALSTORAGE_API_KEY_NAME, keyToValidate);
            currentApiKey = keyToValidate;
            modalErrorMessage.textContent = '';
            modalErrorMessage.style.display = 'none';
            console.log('API Key validated and saved (uppercase).');
            hideApiKeyModal();
            addMessage('ai', 'API Key validated and saved successfully.'); // Use the configured function
        } else {
            if (response.status === 403)
                modalErrorMessage.textContent = `Access Denied. Please ensure you are accessing from an allowed location and the key is correct.`;
            else if (response.status === 401)
                modalErrorMessage.textContent = `Invalid API Key provided.`;
            else {
                const errorData = await response.json().catch(() => ({}));
                modalErrorMessage.textContent = `Validation Error: ${errorData.error || response.statusText}`;
            }
            modalErrorMessage.style.display = 'block';
            console.warn('API Key validation failed:', response.status);
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        modalErrorMessage.textContent = 'Network error during validation. Please try again.';
        modalErrorMessage.style.display = 'block';
    } finally {
        validateKeyButton.disabled = false;
    }
}