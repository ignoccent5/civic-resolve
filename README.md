# CivicResolve — AI-Powered Citizen Grievance Management & Resolution

CivicResolve is an accessible, security-hardened smart-city grievance portal and municipal command center. It combines real-time multilingual NLP triage (with optional Gemini API structured classification), duplicate complaint clustering, SLA prioritization, and closed-loop citizen resolution ratings.

## Architecture & Key Capabilities
- **Hybrid AI Triage Engine (`src/triageEngine.js`)**: Real-time severity scoring (`P1`–`P3`), department routing across 5 municipal boards, SLA estimation, duplicate ticket detection, and multilingual support (English, Hindi, Telugu, Spanish).
- **Security Hardening (`src/security.js`, `nginx.conf`)**: Safe DOM node construction (`textContent`) eliminating XSS vectors, input validation, sliding-window rate limiting, and strict CSP/`X-Frame-Options` headers.
- **High-Efficiency State & Rendering (`src/store.js`, `src/app.js`)**: Fast `Map`-indexed storage with `localStorage` persistence, debounced triage analysis, and `DocumentFragment` batch rendering.
- **WCAG 2.1 AA Accessibility (`index.html`)**: Full ARIA `tablist`/`tabpanel` semantics, `aria-live` status announcements, skip navigation, and keyboard focus management.
- **Automated Test Suite (`tests/civicResolve.test.js`)**: Zero-dependency Node test runner verifying security, AI classification, duplicate clustering, and ticket lifecycle transitions.

## Running Tests Locally
```bash
npm test