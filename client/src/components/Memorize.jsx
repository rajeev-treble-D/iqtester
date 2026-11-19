import { useEffect, useRef, useState } from 'react';

/**
 * Something to remember. A word stays until you say you have it. A number
 * sequence is on screen for a fixed time and then the quiz moves on by itself.
 *
 * `failed` means moving on didn't reach the server: the sequence stays
 * hidden and a button lets you try again.
 */
export function Memorize({ step, busy, failed, onDone }) {
  return step.variant === 'word' ? (
    <WordCard step={step} busy={busy} onDone={onDone} />
  ) : (
    <DigitsCard step={step} failed={failed} onDone={onDone} />
  );
}

function WordCard({ step, busy, onDone }) {
  return (
    <>
      <header className="screen__head">
        <p className="eyebrow">Memory</p>
        <h1 className="question__text">Memorize this word</h1>
        <p className="screen__sub">You will be asked about it later in the quiz.</p>
      </header>
      <div className="memo">
        <p className="memo__word">{step.word}</p>
      </div>
      <p className="screen__hint">Continue whenever you are ready.</p>
      <button className="button button--primary button--wide" type="button" onClick={onDone} disabled={busy} autoFocus>
        I've memorized it
      </button>
    </>
  );
}

function DigitsCard({ step, failed, onDone }) {
  // Fixed when the step first appears; the server decides how much time is left.
  const endsAt = useRef(Date.now() + step.remainingMs);
  const [left, setLeft] = useState(step.remainingMs);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const tick = () => {
      const remaining = endsAt.current - Date.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        done.current();
      }
    };
    const id = window.setInterval(tick, 100);
    tick();
    return () => window.clearInterval(id);
  }, []);

  const visible = left > 0 && step.digits;
  const seconds = Math.ceil(left / 1000);

  return (
    <>
      <header className="screen__head">
        <p className="eyebrow">Memory</p>
        <h1 className="question__text">Memorize this number sequence</h1>
      </header>
      <div className="memo">
        <div className="memo__digits" aria-live="off">
          {(step.digits ?? []).map((digit, i) => (
            <span className="memo__digit" key={i}>
              {visible ? digit : ''}
            </span>
          ))}
        </div>
        <div className="memo__timer" aria-hidden="true">
          <div className="memo__timer-bar" style={{ transform: `scaleX(${step.showMs ? left / step.showMs : 0})` }} />
        </div>
      </div>
      {visible ? (
        <p className="screen__hint" role="timer">
          Disappears in <strong>{seconds}</strong> {seconds === 1 ? 'second' : 'seconds'}
        </p>
      ) : failed ? (
        <button className="button button--primary button--wide" type="button" onClick={onDone}>
          Continue
        </button>
      ) : (
        <p className="screen__hint" role="status">
          Time is up...
        </p>
      )}
    </>
  );
}
