export interface Question {
  a: number;
  b: number;
}

export const TOTAL_LEVELS = 9;
export const MAX_HEARTS = 3;

export function getLevelConfig(level: number) {
  // Base: 20, +10 per level. 
  // Level 1: 20
  // Level 2: 30
  // Level 3: 40
  // Level 4+: 50 (Cap)
  let questionCount = 20 + (level - 1) * 10;
  if (questionCount > 50) {
    questionCount = 50;
  }
  
  const maxMultiplier = level + 1;
  return { questionCount, minMultiplier: 2, maxMultiplier };
}

export function generateQuestions(level: number): Question[] {
  const { questionCount, minMultiplier, maxMultiplier } = getLevelConfig(level);
  
  // 1. Create Pools
  const poolAll: Question[] = [];
  const poolTop: Question[] = []; // Specifically for the highest multiplier (X+1)
  
  for (let a = minMultiplier; a <= maxMultiplier; a++) {
    for (let b = 1; b <= 9; b++) {
      const q = { a, b };
      poolAll.push(q);
      if (a === maxMultiplier) {
        poolTop.push(q);
      }
    }
  }

  // 2. Determine distribution
  // Requirement: At least 1/3 of questions must be from the top multiplier (level + 1)
  const mandatoryTopCount = Math.ceil(questionCount / 3.0);
  const anyCount = questionCount - mandatoryTopCount;
  
  // 3. Create intention list
  const intentions: ('top' | 'any')[] = [];
  for (let i = 0; i < mandatoryTopCount; i++) intentions.push('top');
  for (let i = 0; i < anyCount; i++) intentions.push('any');
  
  // Shuffle intentions (Fisher-Yates) to randomize when the hard questions appear
  for (let i = intentions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [intentions[i], intentions[j]] = [intentions[j], intentions[i]];
  }
  
  // 4. Generate Questions based on intentions
  const questions: Question[] = [];
  let lastQ: Question | null = null;

  for (const intent of intentions) {
    // Select the appropriate pool
    const pool = (intent === 'top') ? poolTop : poolAll;
    
    let randomQ;
    let attempts = 0;
    
    // Try to pick a non-duplicate question
    do {
      randomQ = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
      // Safety break after 20 attempts (unlikely to trigger unless pool is extremely small like 1 item)
    } while (questions.length > 0 && lastQ && randomQ.a === lastQ.a && randomQ.b === lastQ.b && attempts < 20);
    
    questions.push({ ...randomQ });
    lastQ = randomQ;
  }

  return questions;
}
