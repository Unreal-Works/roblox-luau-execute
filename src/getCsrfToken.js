import axios from "axios";

/**
 * Gets a CSRF token using the provided ROBLOSECURITY cookie.
 * @param {string} url The URL to request the CSRF token from.
 * @param {string} roblosecurity The ROBLOSECURITY cookie value.
 * @returns {Promise<string>} The CSRF token.
 */
async function getCsrfToken(url, roblosecurity) {
    try {
        await axios.post(
            url,
            {},
            {
                headers: {
                    Cookie: `.ROBLOSECURITY=${roblosecurity}`,
                },
                validateStatus: () => true, // Accept all status codes
            },
        );
    } catch (error) {
        // Ignore error, we just want the CSRF token
    }
    // Make a request to get the CSRF token
    const res = await axios.post(
        url,
        {},
        {
            headers: {
                Cookie: `.ROBLOSECURITY=${roblosecurity}`,
            },
            validateStatus: () => true, // Accept all status codes
        },
    );
    return res.headers["x-csrf-token"];
}

export default getCsrfToken;
