import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Result } from './pages/Result';
import { Test } from './pages/Test';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/test" element={<Test />} />
      <Route path="/result" element={<Result />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
