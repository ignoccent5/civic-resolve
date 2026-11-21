/**
 * @fileoverview Accessible UI controller for CivicResolve with safe DOM rendering and debounced AI triage.
 */

import { validateGrievanceInput, SubmissionRateLimiter } from './security.js';
import { classifyDeterministic, classifyWithAI, findDuplicateTicket } from './triageEngine.js';
import { GrievanceStore } from './store.js';

const store = new GrievanceStore();
const rateLimiter = new SubmissionRateLimiter(6, 60_000);
let debounceTimer = null;

const PRESETS = {
  water: {
    name: 'Karthik Reddy',
    location: 'Jubilee Avenue, Block C',
    desc: 'Major drinking water pipeline burst leaking thousands of liters onto the main road and causing waterlogging.'
  },
  power: {
    name: 'Priya Menon',
    location: 'Nehru Nagar Bus Depot',
    desc: 'Live electric wire snapped and transformer sparking dangerously near pedestrians.'
  },
  road: {
    name: 'Siddharth Rao',
    location: 'Airport Ring Road Junction',
    desc: 'Huge crater pothole and broken storm drain cover posing severe accident risk for commuters.'
  },
  waste: {
    name: 'Fatima Begum',
    location: 'Old Town Vegetable Market',
    desc: 'Overflowing garbage dump and blocked sewage drain creating foul odor and mosquito breeding.'
  }
};

function updateTelemetry() {
  const m = store.getMetrics();
  document.getElementById('open-count-badge').textContent = String(m.active);
  document.getElementById('strip-active').textContent = String(m.active);
  document.getElementById('kpi-total').textContent = String(m.total);
  document.getElementById('kpi-p1').textContent = String(m.critical);
  document.getElementById('kpi-progress').textContent = String(m.inProgress);
  document.getElementById('kpi-resolved').textContent = String(m.resolved);
}

function renderTriagePreview(result) {
  document.getElementById('ai-confidence').textContent = result.confidence;
  document.getElementById('preview-dept').textContent = result.department;
  document.getElementById('preview-priority').textContent = result.priority;
  document.getElementById('preview-sla').textContent = result.slaLabel;
  document.getElementById('preview-action').textContent = result.action;
}

function handleDebouncedInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const desc = document.getElementById('citizen-desc').value;
    renderTriagePreview(classifyDeterministic(desc));
  }, 180);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderAdminQueue() {
  const filter = document.getElementById('filter-dept').value;
  const container = document.getElementById('admin-ticket-list');
  container.replaceChildren();

  const items = store
    .getAll()
    .filter((t) => filter === 'ALL' || t.department === filter)
    .sort((a, b) => a.priorityRank - b.priorityRank || b.createdAt - a.createdAt);

  if (items.length === 0) {
    container.appendChild(
      createEl('div', 'bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500', 'No grievances found for this department filter.')
    );
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const t of items) {
    const card = createEl('article', 'bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5');

    const left = createEl('div', 'space-y-2 max-w-2xl');
    const metaRow = createEl('div', 'flex flex-wrap items-center gap-2');

    metaRow.appendChild(createEl('span', 'font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md', t.id));

    const prioClass = t.priorityRank === 1
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : t.priorityRank === 2
      ? 'bg-amber-100 text-amber-900 border-amber-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
    metaRow.appendChild(createEl('span', `text-xs font-semibold px-2.5 py-0.5 rounded-full border ${prioClass}`, t.priority));

    const statusClass = t.status === 'Resolved'
      ? 'bg-emerald-100 text-emerald-900'
      : t.status === 'In Progress'
      ? 'bg-indigo-100 text-indigo-900'
      : 'bg-slate-200 text-slate-800';
    metaRow.appendChild(createEl('span', `text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass}`, t.status));

    if (t.duplicateOf) {
      metaRow.appendChild(createEl('span', 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900', `Linked to ${t.duplicateOf}`));
    }

    const minsAgo = Math.max(1, Math.round((Date.now() - t.createdAt) / 60_000));
    metaRow.appendChild(createEl('span', 'text-xs text-slate-600', `• ${minsAgo}m ago • SLA: ${t.slaLabel}`));

    left.appendChild(metaRow);
    left.appendChild(createEl('p', 'text-sm font-medium text-slate-900', t.description));
    left.appendChild(createEl('div', 'text-xs text-slate-600', `Location: ${t.location} | Dept: ${t.department} | Citizen: ${t.citizen}`));
    left.appendChild(createEl('div', 'text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800', `AI Dispatch Plan: ${t.action}`));

    const actions = createEl('div', 'flex items-center gap-2 shrink-0');
    if (t.status === 'Open') {
      const dispatchBtn = createEl('button', 'px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500', 'Dispatch Crew');
      dispatchBtn.type = 'button';
      dispatchBtn.setAttribute('aria-label', `Dispatch crew for ticket ${t.id}`);
      dispatchBtn.addEventListener('click', () => {
        store.updateStatus(t.id, 'In Progress');
        updateTelemetry();
        renderAdminQueue();
      });
      actions.appendChild(dispatchBtn);
    }

    if (t.status !== 'Resolved') {
      const resolveBtn = createEl('button', 'px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500', 'Mark Resolved');
      resolveBtn.type = 'button';
      resolveBtn.setAttribute('aria-label', `Mark ticket ${t.id} resolved`);
      resolveBtn.addEventListener('click', () => {
        store.updateStatus(t.id, 'Resolved');
        updateTelemetry();
        renderAdminQueue();
      });
      actions.appendChild(resolveBtn);
    } else {
      const closedTag = createEl('span', 'text-xs font-semibold text-emerald-700', t.rating ? `✓ Verified (${t.rating}/5 ★)` : '✓ Closed & Verified');
      actions.appendChild(closedTag);
    }

    card.append(left, actions);
    fragment.appendChild(card);
  }

  container.appendChild(fragment);
}

function lookupTicket() {
  const input = document.getElementById('track-input');
  const box = document.getElementById('track-result');
  box.replaceChildren();

  const ticket = store.getById(input.value);
  if (!ticket) {
    box.appendChild(
      createEl('div', 'p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800', 'No grievance found matching that ID. Check the format (e.g., CR-2026-1042) and try again.')
    );
    return;
  }

  const card = createEl('div', 'rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3');
  const top = createEl('div', 'flex items-center justify-between');
  top.appendChild(createEl('span', 'font-mono font-bold text-sm text-slate-900', ticket.id));
  top.appendChild(createEl('span', 'text-xs font-bold px-3 py-1 rounded-full bg-blue-700 text-white', ticket.status));

  card.appendChild(top);
  card.appendChild(createEl('p', 'text-sm text-slate-900 font-medium', ticket.description));

  const grid = createEl('div', 'grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 text-slate-700');
  grid.appendChild(createEl('div', '', `Department: ${ticket.department}`));
  grid.appendChild(createEl('div', '', `SLA Window: ${ticket.slaLabel}`));
  grid.appendChild(createEl('div', '', `Location: ${ticket.location}`));
  grid.appendChild(createEl('div', '', `Priority: ${ticket.priority}`));
  card.appendChild(grid);

  if (ticket.status === 'Resolved') {
    const feedbackRow = createEl('div', 'pt-3 border-t border-slate-200 flex items-center justify-between gap-2');
    feedbackRow.appendChild(createEl('span', 'text-xs font-medium text-slate-700', ticket.rating ? `Your Resolution Rating: ${ticket.rating}/5 ★` : 'Rate resolution quality:'));
    if (!ticket.rating) {
      const btnGroup = createEl('div', 'flex gap-1');
      for (let star = 1; star <= 5; star++) {
        const starBtn = createEl('button', 'px-2 py-1 text-xs rounded bg-white border border-slate-300 hover:bg-amber-50 font-semibold', `${star}★`);
        starBtn.type = 'button';
        starBtn.setAttribute('aria-label', `Rate ${star} out of 5 stars`);
        starBtn.addEventListener('click', () => {
          store.rateResolution(ticket.id, star);
          lookupTicket();
        });
        btnGroup.appendChild(starBtn);
      }
      feedbackRow.appendChild(btnGroup);
    }
    card.appendChild(feedbackRow);
  }

  box.appendChild(card);
}

function switchTab(tabName) {
  ['citizen', 'admin', 'track'].forEach((name) => {
    const view = document.getElementById(`view-${name}`);
    const tab = document.getElementById(`tab-${name}`);
    const isSelected = name === tabName;
    view.classList.toggle('hidden', !isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
    if (isSelected) {
      tab.classList.add('bg-blue-600', 'text-white', 'shadow');
      tab.classList.remove('text-slate-300');
    } else {
      tab.classList.remove('bg-blue-600', 'text-white', 'shadow');
      tab.classList.add('text-slate-300');
    }
  });
  if (tabName === 'admin') renderAdminQueue();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const errorBox = document.getElementById('form-error');
  errorBox.classList.add('hidden');

  if (!rateLimiter.allow()) {
    errorBox.textContent = 'Rate limit reached: please wait a moment before submitting another grievance.';
    errorBox.classList.remove('hidden');
    return;
  }

  const validation = validateGrievanceInput({
    citizen: document.getElementById('citizen-name').value,
    location: document.getElementById('citizen-location').value,
    description: document.getElementById('citizen-desc').value
  });

  if (!validation.valid || !validation.cleanData) {
    errorBox.textContent = validation.errors.join(' ');
    errorBox.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;

  try {
    const apiKey = document.getElementById('gemini-api-key')?.value?.trim() || '';
    const ai = await classifyWithAI(validation.cleanData.description, apiKey);
    const duplicateOf = findDuplicateTicket(
      { location: validation.cleanData.location, department: ai.department },
      store.getAll()
    );

    const id = `CR-2026-${Math.floor(1043 + Math.random() * 8900)}`;
    store.add({
      id,
      citizen: validation.cleanData.citizen,
      location: validation.cleanData.location,
      description: validation.cleanData.description,
      department: ai.department,
      priority: ai.priority,
      priorityRank: ai.priorityRank,
      slaHours: ai.slaHours,
      slaLabel: ai.slaLabel,
      status: 'Open',
      action: ai.action,
      createdAt: Date.now(),
      duplicateOf,
      rating: null
    });

    updateTelemetry();
    document.getElementById('receipt-dept').textContent = duplicateOf
      ? `${ai.department} (Clustered with active ticket ${duplicateOf})`
      : ai.department;
    document.getElementById('receipt-id').textContent = id;
    document.getElementById('submission-receipt').classList.remove('hidden');
    document.getElementById('grievance-form').reset();
    renderTriagePreview(classifyDeterministic(''));
  } finally {
    submitBtn.disabled = false;
  }
}

function init() {
  document.getElementById('tab-citizen').addEventListener('click', () => switchTab('citizen'));
  document.getElementById('tab-admin').addEventListener('click', () => switchTab('admin'));
  document.getElementById('tab-track').addEventListener('click', () => switchTab('track'));
  document.getElementById('view-command-btn').addEventListener('click', () => switchTab('admin'));

  document.getElementById('citizen-desc').addEventListener('input', handleDebouncedInput);
  document.getElementById('grievance-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('filter-dept').addEventListener('change', renderAdminQueue);
  document.getElementById('track-btn').addEventListener('click', lookupTicket);

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.getAttribute('data-preset')];
      if (!p) return;
      document.getElementById('citizen-name').value = p.name;
      document.getElementById('citizen-location').value = p.location;
      document.getElementById('citizen-desc').value = p.desc;
      renderTriagePreview(classifyDeterministic(p.desc));
    });
  });

  document.querySelectorAll('[data-sample-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('track-input').value = btn.getAttribute('data-sample-id');
      lookupTicket();
    });
  });

  updateTelemetry();
}

init();