/**
 * @fileoverview Security utilities for input sanitization, validation, and rate limiting.
 */

const HTML_ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
});

/**
 * Escapes unsafe HTML characters to prevent Cross-Site Scripting (XSS).
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Validates and normalizes citizen grievance form payloads.
 * @param {{ citizen?: string, location?: string, description?: string }} payload
 * @returns {{ valid: boolean, errors: string[], cleanData?: { citizen: string, location: string, description: string } }}
 */
export function validateGrievanceInput(payload) {
  const errors = [];
  const citizen = String(payload?.citizen ?? '').trim();
  const location = String(payload?.location ?? '').trim();
  const description = String(payload?.description ?? '').trim();

  if (citizen.length < 2 || citizen.length > 80) {
    errors.push('Citizen name must be between 2 and 80 characters.');
  }
  if (location.length < 3 || location.length > 140) {
    errors.push('Location must be between 3 and 140 characters.');
  }
  if (description.length < 10 || description.length > 1000) {
    errors.push('Issue description must be between 10 and 1000 characters.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    cleanData: { citizen, location, description }
  };
}

/**
 * Sliding-window client rate limiter to prevent spam floods.
 */
export class SubmissionRateLimiter {
  /**
   * @param {number} maxRequests
   * @param {number} windowMs
   */
  constructor(maxRequests = 5, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    /** @type {number[]} */
    this.timestamps = [];
  }

  /**
   * @param {number} [now]
   * @returns {boolean}
   */
  allow(now = Date.now()) {
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}