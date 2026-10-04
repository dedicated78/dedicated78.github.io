import { addDaysISO } from '@/lib/format';
import type { ActivityType, LeadStatus } from '@/types';

const CALL_OUTCOMES = [
  'No Answer',
  'Voicemail',
  'Wrong Number',
  'Gatekeeper',
  'Decision Maker Reached',
  'Interested',
  'Send Information',
  'Follow Up',
  'Meeting Booked',
  'Not Interested',
  'Do Not Contact',
];

const MESSAGE_OUTCOMES = ['Sent', 'Replied', 'Interested', 'Send Information', 'Follow Up', 'Meeting Booked', 'Not Interested', 'Do Not Contact'];
const MEETING_OUTCOMES = ['Meeting Held', 'Rescheduled', 'No Show', 'Interested', 'Follow Up', 'Not Interested'];

export const OUTCOMES_BY_TYPE: Record<ActivityType, string[]> = {
  Call: CALL_OUTCOMES,
  Email: MESSAGE_OUTCOMES,
  SMS: MESSAGE_OUTCOMES,
  WhatsApp: MESSAGE_OUTCOMES,
  Meeting: MEETING_OUTCOMES,
  Note: [],
};

const EARLY: LeadStatus[] = ['Ready to Call', 'Attempted'];
const OPEN_EARLY: LeadStatus[] = ['Ready to Call', 'Attempted', 'Connected', 'Follow-up'];

/**
 * Suggested lead status after an outcome. Never regresses a lead (a no-answer must not pull an "Interested" lead back),
 * and returns the current status when no change makes sense. The user can always override it in the dialog.
 */
export function suggestStatus(current: LeadStatus, outcome: string): LeadStatus {
  if (current === 'Won' || current === 'Lost' || current === 'Do Not Contact') {
    return outcome === 'Do Not Contact' ? 'Do Not Contact' : current;
  }
  switch (outcome) {
    case 'No Answer':
    case 'Voicemail':
    case 'Wrong Number':
    case 'Gatekeeper':
    case 'Sent':
      return EARLY.includes(current) ? 'Attempted' : current;
    case 'Decision Maker Reached':
    case 'Replied':
      return EARLY.includes(current) || current === 'Follow-up' ? 'Connected' : current;
    case 'Send Information':
    case 'Follow Up':
    case 'Rescheduled':
    case 'No Show':
      return OPEN_EARLY.includes(current) ? 'Follow-up' : current;
    case 'Interested':
      return ['Meeting Booked', 'Qualified'].includes(current) ? current : 'Interested';
    case 'Meeting Booked':
      return current === 'Qualified' ? current : 'Meeting Booked';
    case 'Not Interested':
      return 'Lost';
    case 'Do Not Contact':
      return 'Do Not Contact';
    default:
      return current;
  }
}

/** Default follow-up (days from today) so unanswered leads stay in the queue instead of silently dropping out. */
const FOLLOW_UP_DAYS: Record<string, number> = {
  'No Answer': 1,
  Voicemail: 1,
  Gatekeeper: 1,
  Sent: 2,
  'Send Information': 2,
  'Follow Up': 3,
  Interested: 1,
  'Decision Maker Reached': 2,
  Rescheduled: 1,
  'No Show': 1,
};

export const suggestFollowUp = (outcome: string, today: string): string | null =>
  outcome in FOLLOW_UP_DAYS ? addDaysISO(today, FOLLOW_UP_DAYS[outcome]) : null;

export const suggestNextAction = (outcome: string): string => {
  switch (outcome) {
    case 'No Answer':
    case 'Voicemail':
    case 'Gatekeeper':
      return 'Call again';
    case 'Wrong Number':
      return 'Find the correct number';
    case 'Send Information':
      return 'Send the info, then call to confirm';
    case 'Follow Up':
      return 'Follow up';
    case 'Interested':
      return 'Book a meeting';
    case 'Decision Maker Reached':
      return 'Follow up on the conversation';
    default:
      return '';
  }
};
