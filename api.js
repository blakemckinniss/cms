/**
 * api.js - Handles backend API calls and hashing (2025 modular, robust)
 *
 * - Supports local/prod switching (see getApiBaseUrl)
 * - Exports robust API functions for validate and content generation
 * - Handles all payload fields, error handling, and dynamic response parsing
 */

export const LOCALSTORAGE_API_KEY_NAME = 'userApiKey';
export const FRONTEND_SECRET_SALT_VALUE = "BLAKE123";
const PRODUCTION_BACKEND_BASE_URL = "https://cms-backend-zzz5.onrender.com";
const LOCAL_BACKEND_BASE_URL = 'http://localhost:3001';

// Allow override via ?apiBase=... or localStorage (for advanced dev use)
function getApiBaseUrl() {
    // Check query param
    const params = new URLSearchParams(window.location.search);
    if (params.has('apiBase')) {
        return params.get('apiBase');
    }
    // Check localStorage
    const stored = localStorage.getItem('smsGenApiBase');
    if (stored) return stored;
    // Default logic
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? LOCAL_BACKEND_BASE_URL
        : PRODUCTION_BACKEND_BASE_URL;
}

const BASE_URL = getApiBaseUrl();
export const VALIDATE_URL = `${BASE_URL}/api/validate-key`;
export const GENERATE_URL = `${BASE_URL}/api/generate`;
export const ENHANCE_PROMPT_URL = `${BASE_URL}/api/enhance-prompt`;
export const GENERATE_PROMPT_URL = `${BASE_URL}/api/generate-prompt`;

/**
 * SHA-256 hash for API key + salt (returns hex string)
 */
export async function calculateSecretHash(apiKey, salt) {
    if (salt === "DEV_SALT_REPLACE_IN_BUILD") console.warn("Calculating hash with default development salt.");
    if (!apiKey || !salt) { console.error("Cannot calculate hash: API key or salt is missing."); return null; }
    const dataToHash = apiKey + salt;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate API key with backend.
 * @param {string} apiKey
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function validateApiKey(apiKey) {
    if (!apiKey) return { ok: false, error: "API key is required" };
    const keyToValidate = apiKey.trim().toUpperCase();
    const secretHash = await calculateSecretHash(keyToValidate, FRONTEND_SECRET_SALT_VALUE);
    if (!secretHash) return { ok: false, error: "Configuration error (salt)" };

    try {
        const res = await fetch(VALIDATE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': keyToValidate,
                'X-Frontend-Secret': secretHash
            }
        });
        if (res.ok) return { ok: true };
        if (res.status === 401) return { ok: false, error: "Invalid API Key" };
        if (res.status === 403) return { ok: false, error: "Access Denied. Please check your location or key." };
        let errorMsg = "Validation Error";
        try {
            const data = await res.json();
            if (data && data.error) errorMsg = data.error;
        } catch { /* ignore */ }
        return { ok: false, error: errorMsg };
    } catch (err) {
        return { ok: false, error: "Network error during validation. Please try again." };
    }
}

/**
 * Generate content (SMS or Email) via backend API.
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.userPrompt
 * @param {Object} params.settings
 * @param {string} [params.marketingData]
 * @param {string} [params.smsData]
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function generateContent(params) {
    const { apiKey, ...rest } = params;
    if (!apiKey) return { ok: false, error: "API key is required" };
    if (!rest.userPrompt && !(rest.settings && rest.settings.mode === 'email')) return { ok: false, error: "Prompt is required" };
    const secretHash = await calculateSecretHash(apiKey, FRONTEND_SECRET_SALT_VALUE);
    if (!secretHash) return { ok: false, error: "Configuration error (salt)" };

    try {
        const res = await fetch(GENERATE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-Frontend-Secret': secretHash
            },
            body: JSON.stringify(rest)
        });

        if (!res.ok) {
            let errorMsg = `Error: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                if (errorData && errorData.error) {
                    if (res.status === 401) errorMsg = "Invalid or unauthorized API Key. Please refresh the page.";
                    else if (res.status === 403) errorMsg = `Access Denied. (${errorData.error || 'Please ensure you are accessing from an allowed location.'})`;
                    else if (res.status === 429) errorMsg = `Rate limit exceeded. ${errorData.message || 'Please wait before making another request.'}`;
                    else errorMsg = errorData.error;
                }
            } catch { /* ignore */ }
            return { ok: false, error: errorMsg };
        }

        // Always expect JSON with { result: ... }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data && data.error) return { ok: false, error: data.error };
            if (typeof data.result === "string") {
                return { ok: true, data: data.result };
            }
            // fallback for legacy or unexpected structure
            return { ok: true, data };
        } else {
            const textData = await res.text();
            if (!textData) return { ok: false, error: "Received an empty response from the server." };
            return { ok: true, data: textData };
        }
    } catch (err) {
        return { ok: false, error: `Network error: Could not reach the backend. (${err.message})` };
    }
}


/**
 * Enhances the given prompt text via the backend API.
 * @param {string} mode - 'sms' or 'email'.
 * @param {string} promptText - The text to enhance.
 * @returns {Promise<{enhancedPrompt?: string, error?: string}>}
 */
export async function enhancePrompt(mode, promptText) {
    const apiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
    if (!apiKey) return { error: "API key not found. Please validate your key first." };
    if (!promptText) return { error: "Prompt text is required to enhance." };

    const secretHash = await calculateSecretHash(apiKey, FRONTEND_SECRET_SALT_VALUE);
    if (!secretHash) return { error: "Configuration error (salt)" };

    try {
        const res = await fetch(ENHANCE_PROMPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-Frontend-Secret': secretHash
            },
            body: JSON.stringify({ mode, promptText })
        });

        const data = await res.json(); // Always expect JSON

        if (!res.ok) {
            let errorMsg = `Error: ${res.status} ${res.statusText}`;
            if (data && data.error) {
                if (res.status === 401) errorMsg = "Invalid or unauthorized API Key.";
                else if (res.status === 403) errorMsg = `Access Denied. (${data.error || 'Check location/key.'})`;
                else errorMsg = data.error;
            }
            return { error: errorMsg };
        }

        if (data && data.enhancedPrompt) {
            return { enhancedPrompt: data.enhancedPrompt };
        } else {
            return { error: data.error || "Received invalid response from server." };
        }

    } catch (err) {
        return { error: `Network error during enhancement: ${err.message}` };
    }
}

/**
 * Generates a new prompt based on topic and tone via the backend API.
 * @param {string} mode - 'sms' or 'email'.
 * @param {string} topic - The topic for the prompt.
 * @param {string} tone - The desired tone for the prompt.
 * @returns {Promise<{generatedPrompt?: string, error?: string}>}
 */
export async function generatePrompt(mode, topic, tone) {
    const apiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
    if (!apiKey) return { error: "API key not found. Please validate your key first." };
    if (!topic || !tone) return { error: "Topic and Tone are required to generate a prompt." };

    const secretHash = await calculateSecretHash(apiKey, FRONTEND_SECRET_SALT_VALUE);
    if (!secretHash) return { error: "Configuration error (salt)" };

    try {
        const res = await fetch(GENERATE_PROMPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-Frontend-Secret': secretHash
            },
            body: JSON.stringify({ mode, topic, tone })
        });

        const data = await res.json(); // Always expect JSON

        if (!res.ok) {
            let errorMsg = `Error: ${res.status} ${res.statusText}`;
            if (data && data.error) {
                if (res.status === 401) errorMsg = "Invalid or unauthorized API Key.";
                else if (res.status === 403) errorMsg = `Access Denied. (${data.error || 'Check location/key.'})`;
                else errorMsg = data.error;
            }
            return { error: errorMsg };
        }

        if (data && data.generatedPrompt) {
            return { generatedPrompt: data.generatedPrompt };
        } else {
            return { error: data.error || "Received invalid response from server." };
        }

    } catch (err) {
        return { error: `Network error during generation: ${err.message}` };
    }
}

// Deprecated: Use generateContent instead
export const generateSms = () => {
    throw new Error("generateSms is deprecated. Use generateContent({ ... }) instead.");
};