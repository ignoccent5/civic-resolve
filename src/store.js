/**
 * @fileoverview Map-indexed grievance store with localStorage persistence and lifecycle transitions.
 */

const STORAGE_KEY = 'civic_resolve_tickets_v2';

export const SEED_TICKETS = [
  {
    id: 'CR-2026-1042',
    citizen: 'Ananya Verma',
    location: 'MG Road Cross, Ward 12',
    description: 'High-voltage overhead transformer sparking continuously near school gate after rain.',
    department: 'Electrical & Grid',
    priority: 'P1 • Critical',
    priorityRank: 1,
    slaHours: 2,
    slaLabel: '2 Hours',
    status: 'In Progress',
    action: 'Dispatch Emergency Lineman Unit #4; isolate feeder line immediately.',
    createdAt: Date.now() - 18 * 60_000,
    duplicateOf: null,
    rating: null
  },
  {
    id: 'CR-2026-1041',
    citizen: 'Rohan Kulkarni',
    location: 'Indiranagar 2nd Stage',
    description: 'Major underground drinking water pipeline burst flooding the residential street.',
    department: 'Water & Sewage Board',
    priority: 'P2 • High',
    priorityRank: 2,
    slaHours: 6,
    slaLabel: '6 Hours',
    status: 'Open',
    action: 'Close Ward 12 zonal valve and deploy mobile dewatering & pipe repair crew.',
    createdAt: Date.now() - 42 * 60_000,
    duplicateOf: null,
    rating: null
  },
  {
    id: 'CR-2026-1040',
    citizen: 'Meera Nair',
    location: 'Station Approach Flyover',
    description: 'Deep 2-foot pothole on the left lane causing bikes to skid during evening traffic.',
    department: 'Roads & Infrastructure',
    priority: 'P2 • High',
    priorityRank: 2,
    slaHours: 12,
    slaLabel: '12 Hours',
    status: 'In Progress',
    action: 'Place reflective safety barricades and schedule cold-mix asphalt patch.',
    createdAt: Date.now() - 120 * 60_000,
    duplicateOf: null,
    rating: null
  },
  {
    id: 'CR-2026-1039',
    citizen: 'Vikramjit Singh',
    location: 'Green Park Community Market',
    description: 'Municipal garbage compactor bin has not been cleared for 3 days.',
    department: 'Solid Waste Management',
    priority: 'P3 • Standard',
    priorityRank: 3,
    slaHours: 24,
    slaLabel: '24 Hours',
    status: 'Resolved',
    action: 'Reroute Zone-B tipper truck for immediate clearance and sanitization.',
    createdAt: Date.now() - 300 * 60_000,
    duplicateOf: null,
    rating: 5
  }
];

export class GrievanceStore {
  /**
   * @param {Storage | null} [storage]
   */
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
    /** @type {Map<string, any>} */
    this.ticketMap = new Map();
    this.load();
  }

  load() {
    let initial = SEED_TICKETS;
    if (this.storage) {
      try {
        const raw = this.storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initial = parsed;
          }
        }
      } catch {
        // Fallback to seed data if storage is corrupted
      }
    }
    this.ticketMap.clear();
    for (const ticket of initial) {
      this.ticketMap.set(ticket.id, ticket);
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.getAll()));
    } catch {
      // Ignore quota errors
    }
  }

  getAll() {
    return Array.from(this.ticketMap.values());
  }

  getById(id) {
    return this.ticketMap.get(String(id || '').trim().toUpperCase()) || null;
  }

  add(ticket) {
    this.ticketMap.set(ticket.id, ticket);
    this.save();
    return ticket;
  }

  updateStatus(id, status) {
    const ticket = this.getById(id);
    if (!ticket) return null;
    ticket.status = status;
    this.save();
    return ticket;
  }

  rateResolution(id, rating) {
    const ticket = this.getById(id);
    if (!ticket || ticket.status !== 'Resolved') return null;
    ticket.rating = Math.min(5, Math.max(1, Number(rating)));
    this.save();
    return ticket;
  }

  getMetrics() {
    const all = this.getAll();
    return {
      total: all.length,
      active: all.filter((t) => t.status !== 'Resolved').length,
      critical: all.filter((t) => t.priorityRank === 1 && t.status !== 'Resolved').length,
      inProgress: all.filter((t) => t.status === 'In Progress').length,
      resolved: all.filter((t) => t.status === 'Resolved').length
    };
  }
}