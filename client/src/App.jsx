import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Result } from './pages/Result';
import { Test } from './pages/Test';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/quiz/:quizId" element={<Test />} />
      <Route path="/quiz/:quizId/result" element={<Result />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
