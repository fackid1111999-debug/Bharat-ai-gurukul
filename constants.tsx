
import { Course } from './types';

export const COURSES: Course[] = ([
  // AI Future
  { id: 'ai-prompt', name: 'AI Prompt Engineering', category: 'AI Future', description: 'Master the art of speaking to machines.' },
  { id: 'ai-labeling', name: 'AI Data Annotation', category: 'AI Future', description: 'Build the fuel for modern AI systems.' },
  { id: 'ai-ethics', name: 'AI Ethics & Safety', category: 'AI Future', description: 'Ensuring technology serves humanity safely.' },
  
  // Traditional
  { id: 'vedic-math', name: 'Vedic Mathematics', category: 'Traditional', description: 'Ancient Indian shortcuts for lightning speed math.' },
  { id: 'ayurveda', name: 'Ayurveda & Wellness', category: 'Traditional', description: 'Traditional science of holistic health.' },
  { id: 'vastu', name: 'Vastu & Architecture', category: 'Traditional', description: 'The science of living spaces and energy.' },
  { id: 'sanskrit-guru', name: 'Sanskrit Mastery', category: 'Traditional', description: 'Learning the mother of all languages.' },

  // Modern
  { id: 'digital-market', name: 'Digital Marketing for Bharat', category: 'Modern', description: 'Grow local business using modern tools.' },
  { id: 'fin-literacy', name: 'Financial Literacy', category: 'Modern', description: 'Managing money, banking, and investments.' },
  { id: 'agri-tech', name: 'Smart Agriculture', category: 'Modern', description: 'Using tech to double crop yield and quality.' },
  { id: 'mobile-fix', name: 'Mobile Hardware & Tech', category: 'Modern', description: 'Mastering the most used device in the world.' },
  { id: 'ca-course', name: 'Chartered Accountant (CA)', category: 'Modern', description: 'Professional accounting and finance mastery based on ICAI standards.' }
] as Course[]).sort((a, b) => a.name.localeCompare(b.name));

export const LANGUAGES = [
  { id: 'hinglish', name: 'Hinglish (हिन्दी + English)', flag: '🇮🇳' },
  { id: 'sanskrit', name: 'Sanskrit (संस्कृतम्)', flag: '🕉️' },
  { id: 'hindi', name: 'Pure Hindi (हिन्दी)', flag: '📙' },
  { id: 'english', name: 'Global English', flag: '🌐' },
  { id: 'banglish', name: 'Banglish (বাংলা + English)', flag: '🇧🇩' },
  { id: 'tanglish', name: 'Tanglish (தமிழ் + English)', flag: '🌿' }
];

export const APP_COLORS = {
  primary: '#F97316', // Saffron
  secondary: '#0D9488', // Teal
  accent: '#FACC15', // Gold
  background: '#020617', // Deep Indigo
};

export const CULTURAL_SOUNDS = {
  success: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3', // Simulated Bell/Success
  milestone: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3', // Simulated Shankh
};

export const DEV_PASSWORD = "Vedas & Sanskrit";

export const BOOKS: Record<string, { id: string; name: string; description: string; totalLevels: number }[]> = {
  'ai-prompt': [
    { id: 'prompt-b1', name: 'Book 1: Foundations of Prompting', description: 'Basics of talking to AI.', totalLevels: 200 },
    { id: 'prompt-b2', name: 'Book 2: Advanced Techniques', description: 'Mastering complex prompts.', totalLevels: 200 }
  ],
  'ca-course': [
    { id: 'ca-b1', name: 'Book 1: Accounting Principles', description: 'Fundamentals of CA accounting.', totalLevels: 200 },
    { id: 'ca-b2', name: 'Book 2: Mercantile Laws', description: 'Legal frameworks for business.', totalLevels: 200 },
    { id: 'ca-b3', name: 'Book 3: Taxation Basics', description: 'Introduction to Indian tax systems.', totalLevels: 200 }
  ],
  'vedic-math': [
    { id: 'vm-b1', name: 'Book 1: Speed Addition & Subtraction', description: 'Ancient mental math secrets.', totalLevels: 200 },
    { id: 'vm-b2', name: 'Book 2: Lightning Multiplication', description: 'Multiply large numbers in seconds.', totalLevels: 200 }
  ]
};

// Default books for other courses
COURSES.forEach(course => {
  if (!BOOKS[course.id]) {
    BOOKS[course.id] = [
      { id: `${course.id}-b1`, name: 'Book 1: Introduction', description: `Starting your journey in ${course.name}.`, totalLevels: 200 }
    ];
  }
});

export const BADGES = [
  { id: 'streak-10', name: 'Dash-Sopan', icon: '🔥', description: 'Mastered 10 stages in a row!', category: 'streak' },
  { id: 'perfect-exam', name: 'Agni-Siddha', icon: '💎', description: 'Scored 100% in a Maha-Pariksha!', category: 'exam' },
  { id: 'category-master', name: 'Vishay-Samrat', icon: '👑', description: 'Completed all courses in a category!', category: 'completion' },
  { id: 'first-step', name: 'Pratham-Pad', icon: '👣', description: 'Completed your first stage!', category: 'streak' },
  { id: 'halfway', name: 'Ardha-Siddhi', icon: '🌓', description: 'Reached Stage 50! Halfway to mastery.', category: 'streak' },
  { id: 'exam-warrior', name: 'Pariksha-Veer', icon: '⚔️', description: 'Passed 5 Maha-Parikshas!', category: 'exam' },
  { id: 'quick-thinker', name: 'Druta-Buddhi', icon: '⚡', description: 'Completed 5 stages in a single session!', category: 'streak' },
  { id: 'early-bird', name: 'Brahma-Muhurta', icon: '🌅', description: 'Studied during the auspicious morning hours!', category: 'streak' },
  { id: 'night-owl', name: 'Ratri-Yogi', icon: '🌙', description: 'Studied deep into the night!', category: 'streak' },
  { id: 'god-level', name: 'Deva-Siddhi', icon: '🕉️', description: 'Attained the ultimate God Level mastery!', category: 'completion' },
];
