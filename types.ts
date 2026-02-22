
export enum BitiEmotion {
  EXCITED = 'EXCITED', // Win
  STUDIOUS = 'STUDIOUS', // Learning
  ENCOURAGING = 'ENCOURAGING', // Failure
  PROFESSIONAL = 'PROFESSIONAL' // Hard Tests
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'streak' | 'exam' | 'completion';
}

export interface Book {
  id: string;
  name: string;
  description: string;
  totalLevels: number;
}

export interface UserProgress {
  name: string;
  fatherName: string;
  contact: string;
  language: string;
  completedStages: number;
  currentCourse: string;
  currentBook?: string;
  selfieUrl?: string;
  earnedBadges: string[]; // IDs of badges
  streak: number;
  examsPassed: number;
  sessionStages: number;
}

export interface Stage {
  id: number;
  title: string;
  milestone: number;
  type: 'concept' | 'analogy' | 'interactive' | 'check';
  description: string;
}

export interface Course {
  id: string;
  name: string;
  category: 'Traditional' | 'Modern' | 'AI Future';
  description: string;
}

export interface ContentChunk {
  explanation: string;
  analogy?: string;
  task?: string;
  check?: string;
}

export interface ExamQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ExamContent {
  title: string;
  questions: ExamQuestion[];
}
