import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHTML, validateGrievanceInput, SubmissionRateLimiter } from '../src/security.js';
import { classifyDeterministic, findDuplicateTicket } from '../src/triageEngine.js';
import { GrievanceStore } from '../src/store.js';

test('Security: escapeHTML neutralizes XSS script injection payloads', () => {
  const payload = `<script>alert("xss")</script>'/`;
  const escaped = escapeHTML(payload);
  assert.equal(escaped.includes('<script>'), false);
  assert.equal(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;&#39;&#x2F;');
});

test('Security: validateGrievanceInput rejects empty or oversized payloads', () => {
  const invalid = validateGrievanceInput({ citizen: 'A', location: 'Rd', description: 'Short' });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 3);

  const valid = validateGrievanceInput({
    citizen: '  Aarav Sharma  ',
    location: '  Sector 14 Market  ',
    description: '  Exposed live power cable sparking near bus stop.  '
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.cleanData.citizen, 'Aarav Sharma');
});

test('Security: SubmissionRateLimiter enforces sliding window limits', () => {
  const limiter = new SubmissionRateLimiter(2, 10_000);
  assert.equal(limiter.allow(1000), true);
  assert.equal(limiter.allow(2000), true);
  assert.equal(limiter.allow(3000), false);
  assert.equal(limiter.allow(12_000), true);
});

test('AI Triage: classifies critical electrical, water, road, waste, and multilingual inputs', () => {
  const p1 = classifyDeterministic('Transformer sparking near school');
  assert.equal(p1.department, 'Electrical & Grid');
  assert.equal(p1.priorityRank, 1);
  assert.equal(p1.slaHours, 2);

  const water = classifyDeterministic('Main water pipeline burst on avenue');
  assert.equal(water.department, 'Water & Sewage Board');
  assert.equal(water.priorityRank, 2);

  const hindiRoad = classifyDeterministic('मुख्य सड़क पर बड़ा गड्ढा है');
  assert.equal(hindiRoad.department, 'Roads & Infrastructure');

  const waste = classifyDeterministic('Garbage bin overflowing for days');
  assert.equal(waste.department, 'Solid Waste Management');
  assert.equal(waste.priorityRank, 3);
});

test('AI Triage: findDuplicateTicket clusters active complaints in same department & locality', () => {
  const store = new GrievanceStore(null);
  const dupId = findDuplicateTicket(
    { location: 'MG Road Cross', department: 'Electrical & Grid' },
    store.getAll()
  );
  assert.equal(dupId, 'CR-2026-1042');

  const resolvedNotDup = findDuplicateTicket(
    { location: 'Green Park Community Market', department: 'Solid Waste Management' },
    store.getAll()
  );
  assert.equal(resolvedNotDup, null);
});

test('Store: fast lookup, status lifecycle transitions, and resolution rating', () => {
  const store = new GrievanceStore(null);
  const ticket = store.getById('cr-2026-1041');
  assert.equal(ticket.status, 'Open');

  store.updateStatus('CR-2026-1041', 'In Progress');
  assert.equal(store.getById('CR-2026-1041').status, 'In Progress');

  assert.equal(store.rateResolution('CR-2026-1041', 5), null);

  store.updateStatus('CR-2026-1041', 'Resolved');
  store.rateResolution('CR-2026-1041', 5);
  assert.equal(store.getById('CR-2026-1041').rating, 5);
});