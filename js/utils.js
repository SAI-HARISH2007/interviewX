// Small shared helpers used across the application.

// Escape a string for safe insertion into HTML.
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

// Clamp a number between min and max (inclusive).
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
