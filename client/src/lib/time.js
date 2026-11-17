import { useEffect, useState } from 'react';

/**
 * Milliseconds since `startedAt`, measured on the server's clock.
 * `clockOffset` = serverNow - Date.now() at the time of the last response,
 * so a wrong device clock doesn't distort the timer.
 */
export function useElapsed(startedAt, clockOffset) {
  const read = () => Math.max(0, Date.now() + clockOffset - startedAt);
  const [elapsed, setElapsed] = useState(read);
  useEffect(() => {
    setElapsed(read());
    const id = window.setInterval(() => setElapsed(read()), 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, clockOffset]);
  return elapsed;
}

export function formatClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
