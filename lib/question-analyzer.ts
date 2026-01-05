
export type QuestionType =
  | 'FINANCIAL'
  | 'CAREER'
  | 'LIFESTYLE'
  | 'RELATIONSHIP'
  | 'EDUCATION'
  | 'BUSINESS'
  | 'HEALTH'
  | 'PERSONAL_DEVELOPMENT'
  | 'TECHNOLOGY'
  | 'GENERAL';

interface QuestionTypeConfig {
  keywords: string[];
  needs: string[];
  agents: string[];
  synthesisStyle: string;
  disclaimer?: string;
  sensitivityLevel?: 'high' | 'medium' | 'low';
}

export const QUESTION_TYPES: Record<string, QuestionTypeConfig> = {
  FINANCIAL: {
    keywords: ['$', 'money', 'salary', 'investment', 'cost', 'price', 'pay', 'income', 'equity', 'bitcoin', 'rent', 'buy', 'afford', 'budget'],
    needs: ['math', 'ROI', 'breakeven', 'risk analysis'],
    agents: ['financial_analyst', 'risk_assessor'],
    synthesisStyle: 'quantitative'
  },

  CAREER: {
    keywords: ['job', 'career', 'work', 'boss', 'company', 'startup', 'promotion', 'quit', 'fired', 'hiring', 'offer', 'salary', 'resume'],
    needs: ['life stage', 'risk tolerance', 'growth potential'],
    agents: ['career_strategist', 'risk_realist'],
    synthesisStyle: 'life-stage-based'
  },

  LIFESTYLE: {
    keywords: ['move', 'city', 'house', 'apartment', 'location', 'neighborhood', 'commute', 'live', 'relocate'],
    needs: ['values', 'priorities', 'life quality'],
    agents: ['lifestyle_optimizer', 'practical_realist'],
    synthesisStyle: 'values-based'
  },

  RELATIONSHIP: {
    keywords: ['relationship', 'dating', 'marry', 'breakup', 'divorce', 'partner', 'girlfriend', 'boyfriend', 'husband', 'wife', 'kids', 'children'],
    needs: ['emotional insight', 'compatibility', 'long-term vision'],
    agents: ['emotional_advisor', 'pragmatic_realist'],
    synthesisStyle: 'reflective',
    sensitivityLevel: 'high'
  },

  EDUCATION: {
    keywords: ['college', 'university', 'degree', 'course', 'learn', 'study', 'bootcamp', 'certification', 'masters', 'phd', 'mba'],
    needs: ['career ROI', 'skill development', 'market demand'],
    agents: ['education_strategist', 'market_analyst'],
    synthesisStyle: 'outcome-focused'
  },

  BUSINESS: {
    keywords: ['startup', 'business', 'founder', 'B2B', 'B2C', 'product', 'launch', 'pivot', 'market', 'users', 'customers', 'revenue'],
    needs: ['market analysis', 'competitive advantage', 'scalability'],
    agents: ['business_strategist', 'market_realist'],
    synthesisStyle: 'strategic'
  },

  HEALTH: {
    keywords: ['health', 'diet', 'exercise', 'surgery', 'medical', 'doctor', 'therapy', 'workout', 'weight', 'mental health'],
    needs: ['risk/benefit', 'medical evidence', 'quality of life'],
    agents: ['health_analyst', 'risk_assessor'],
    synthesisStyle: 'evidence-based',
    disclaimer: 'This is not medical advice. Consult a healthcare professional.'
  },

  PERSONAL_DEVELOPMENT: {
    keywords: ['habit', 'productivity', 'goal', 'self-improvement', 'skill', 'time management', 'focus', 'motivation', 'procrastination'],
    needs: ['behavior change', 'practical steps', 'motivation'],
    agents: ['habit_coach', 'pragmatic_realist'],
    synthesisStyle: 'action-oriented'
  },

  TECHNOLOGY: {
    keywords: ['software', 'framework', 'programming', 'tech stack', 'tool', 'app', 'platform', 'code', 'database', 'language', 'react', 'nextjs', 'python'],
    needs: ['technical tradeoffs', 'ecosystem', 'learning curve'],
    agents: ['technical_analyst', 'pragmatic_developer'],
    synthesisStyle: 'technical'
  }
};

export interface QuestionAnalysis {
  type: QuestionType;
  subtype: string | null;
  options: { optionA: string; optionB: string } | null;
  characteristics: {
    hasNumbers: boolean;
    isUrgent: boolean;
    isLongTerm: boolean;
    hasEmotionalWords: boolean;
    mentionsFamily: boolean;
  };
  config: QuestionTypeConfig;
}

export class QuestionAnalyzer {
  static analyze(userQuestion: string): QuestionAnalysis {
    const questionLower = userQuestion.toLowerCase();

    // Step 1: Detect question type
    const detectedTypes = this.detectTypes(questionLower);
    const primaryType = (detectedTypes[0] || 'GENERAL') as QuestionType;

    // Step 2: Extract options (X vs Y)
    const options = this.extractOptions(userQuestion);

    // Step 3: Detect special characteristics
    const characteristics = this.detectCharacteristics(questionLower);

    return {
      type: primaryType,
      subtype: detectedTypes[1] || null,
      options: options,
      characteristics: characteristics,
      config: QUESTION_TYPES[primaryType] || {
        keywords: [],
        needs: ['general analysis'],
        agents: ['strategic_analyst', 'devils_advocate'],
        synthesisStyle: 'general'
      }
    };
  }

  private static detectTypes(questionLower: string): string[] {
    const scores: { type: string; score: number }[] = [];

    for (const [type, config] of Object.entries(QUESTION_TYPES)) {
      const keywordMatches = config.keywords.filter(keyword =>
        questionLower.includes(keyword) || new RegExp(`\\b${keyword}\\b`).test(questionLower)
      ).length;

      if (keywordMatches > 0) {
        scores.push({ type, score: keywordMatches });
      }
    }

    // Sort by score descending, return top matches
    return scores
      .sort((a, b) => b.score - a.score)
      .map(s => s.type);
  }

  private static extractOptions(question: string): { optionA: string; optionB: string } | null {
    // "Should I do X or Y?" pattern
    const orPattern = /(.+?)\s+or\s+(.+?)(\?|$)/i;
    const match = question.match(orPattern);

    // Simple verification to prevent false positives on long sentences without clear options
    if (match && match[1].length < 100 && match[2].length < 100) {
      return {
        optionA: this.cleanOption(match[1]),
        optionB: this.cleanOption(match[2])
      };
    }

    // "X vs Y" pattern
    const vsPattern = /(.+?)\s+vs\.?\s+(.+?)(\?|$)/i;
    const vsMatch = question.match(vsPattern);

    if (vsMatch && vsMatch[1].length < 100 && vsMatch[2].length < 100) {
      return {
        optionA: this.cleanOption(vsMatch[1]),
        optionB: this.cleanOption(vsMatch[2])
      };
    }

    return null;
  }

  private static cleanOption(text: string): string {
    // Remove common prefixes
    return text
      .replace(/^(should i|do i|is it better to|can i|what if i|would it be better to)/i, '')
      .trim();
  }

  private static detectCharacteristics(questionLower: string) {
    return {
      hasNumbers: /\d/.test(questionLower),
      isUrgent: ['now', 'immediately', 'today', 'urgent', 'asap', 'soon'].some(w => questionLower.includes(w)),
      isLongTerm: ['future', 'years', 'decades', 'forever', 'lifetime', 'long run', 'retirement'].some(w => questionLower.includes(w)),
      hasEmotionalWords: ['love', 'hate', 'scared', 'excited', 'worried', 'fear', 'anxious', 'happy', 'sad'].some(w => questionLower.includes(w)),
      mentionsFamily: ['family', 'kids', 'children', 'spouse', 'wife', 'husband', 'partner', 'parents', 'mom', 'dad'].some(w => questionLower.includes(w))
    };
  }
}
