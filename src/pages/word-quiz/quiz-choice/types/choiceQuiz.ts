export interface ChoiceQuestion {
  id: string
  word: string
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

export interface ChoiceQuizResult {
  total: number
  correct: number
  wrong: number
  accuracy: number
  details: ChoiceQuizDetail[]
}

export interface ChoiceQuizDetail {
  questionId: string
  word: string
  question: string
  options: string[]
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
}

export interface ChoiceQuizState {
  questions: ChoiceQuestion[]
  currentIndex: number
  userAnswers: Map<string, string>
  isCompleted: boolean
  result: ChoiceQuizResult | null
}
