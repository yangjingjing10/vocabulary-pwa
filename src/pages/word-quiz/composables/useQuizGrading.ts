import type { QuizQuestion, QuizResult } from '../types/quiz'
import { checkQuizAnswer, getCorrectAnswer } from '../utils/quizAnswerMatch'

/**
 * 本地词典批改（不再调用 AI）
 */
export function useQuizGrading() {
  function gradeQuestion(
    question: Pick<QuizQuestion, 'word' | 'translation' | 'direction' | 'userAnswer'>,
  ): QuizResult {
    const correctAnswer = getCorrectAnswer(question)
    const isCorrect = checkQuizAnswer(question, question.userAnswer)

    return {
      word: question.word,
      userAnswer: question.userAnswer,
      correctAnswer,
      isCorrect,
      direction: question.direction,
    }
  }

  function gradeAllAnswers(
    answeredQuestions: Pick<QuizQuestion, 'word' | 'translation' | 'direction' | 'userAnswer'>[],
  ): QuizResult[] {
    return answeredQuestions
      .filter((q) => q.userAnswer.trim() !== '')
      .map((q) => gradeQuestion(q))
  }

  return {
    gradeQuestion,
    gradeAllAnswers,
  }
}
