import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, api } from '../api/client';
import { loadLevel, saveSession } from './session';

/**
 * Start (or restart) a quiz and go to it. Returns the id of the quiz being
 * started, if any, and the last error.
 *
 * Quizzes with right/wrong questions begin with a short self-rating that sets
 * the starting difficulty. Once the General quiz has been taken, its result
 * is used instead.
 */
export function useStartQuiz() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(null);
  const [error, setError] = useState(null);

  const start = useCallback(
    async (quiz) => {
      setStarting(quiz.id);
      setError(null);
      try {
        const level = quiz.group === 'ability' ? loadLevel() : null;
        const { attemptId, token } = await api.start(level ? { quizId: quiz.id, level } : { quizId: quiz.id });
        saveSession(quiz.id, { attemptId, token });
        navigate(`/quiz/${quiz.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setStarting(null);
      }
    },
    [navigate],
  );

  return { start, starting, error };
}
