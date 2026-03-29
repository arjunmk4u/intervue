import { ISession } from '../models/Session';

// Max questions per phase before moving to the next
const PHASE_LIMITS = {
  'intro': 1,       // 1 intro question
  'resume': 3,      // 3 resume-based questions
  'technical': 3,   // 3 technical questions
  'behavioral': 2,  // 2 behavioral questions
  'situational': 2, // 2 situational questions
  'closing': 1      // 1 closing question
};

const PHASE_ORDER = ['intro', 'resume', 'technical', 'behavioral', 'situational', 'closing'] as const;

export function advancePhaseIfNeeded(session: ISession): boolean {
  const currentPhase = session.phase;
  const limits = PHASE_LIMITS[currentPhase];
  
  // Notice: questionIndex counts how many questions have been asked IN THIS PHASE
  if (session.questionIndex >= limits) {
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    
    // Move to next phase if not at the end
    if (currentIndex < PHASE_ORDER.length - 1) {
      session.phase = PHASE_ORDER[currentIndex + 1];
      session.questionIndex = 0; // reset for the new phase
      return true; // phase changed
    }
  }
  
  return false; // phase not changed
}
