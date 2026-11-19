import { Gauge, Radar } from './Charts';

const questions = (n) => `${n} ${n === 1 ? 'question' : 'questions'}`;

/** What an in-between screen says. Every number on it comes from the server. */
function content(step) {
  switch (step.variant) {
    case 'speed':
      if (step.percent === null) {
        return {
          title: "You're keeping a good pace",
          text: 'Speed does not change your score. Accuracy does, so take the time each question needs.',
          art: <PaceMark />,
        };
      }
      if (step.percent >= 50) {
        return {
          title: (
            <>
              You're faster than <em>{step.percent}%</em> of people at this point
            </>
          ),
          text: 'Measured from the start of the quiz to this screen. Speed does not change your score, so keep answering carefully.',
          art: <Gauge value={step.percent} startLabel="slower" endLabel="faster" />,
        };
      }
      return {
        title: "You're taking a careful pace",
        text: `About ${100 - step.percent}% of people reached this point sooner. That is fine: speed does not change your score, accuracy does.`,
        art: <Gauge value={step.percent} startLabel="slower" endLabel="faster" />,
      };

    case 'profile':
      return {
        title: 'Your profile is taking shape',
        text: 'Every answer adds detail. Hollow points are areas the quiz has not reached yet.',
        art: <Radar axes={step.axes} />,
      };

    default:
      return {
        title:
          step.percent >= 80 ? (
            <>
              Almost there: only <em>{step.left}</em> {step.left === 1 ? 'question' : 'questions'} left
            </>
          ) : (
            <>
              Past halfway: <em>{step.left}</em> {step.left === 1 ? 'question' : 'questions'} left
            </>
          ),
        text: `You have answered ${step.percent}% of the questions. ${questions(step.left)} more and your result is ready.`,
        art: <Gauge value={step.percent} startLabel="start" endLabel="finish" />,
      };
  }
}

export function InfoScreen({ step, busy, onContinue }) {
  const { title, text, art } = content(step);
  return (
    <>
      <h1 className="question__text screen__title">{title}</h1>
      <div className="screen__art">{art}</div>
      <p className="screen__sub">{text}</p>
      <button className="button button--primary button--wide" type="button" onClick={onContinue} disabled={busy} autoFocus>
        Continue
      </button>
    </>
  );
}

/** A plain stopwatch, for when there is no pace figure to show yet. */
function PaceMark() {
  return (
    <svg className="pacemark" viewBox="0 0 120 120" aria-hidden="true">
      <circle className="pacemark__ring" cx="60" cy="66" r="40" />
      <path className="pacemark__hand" d="M60 66 L60 40 M60 66 L76 76" />
      <path className="pacemark__top" d="M50 14 H70 M60 14 V26" />
    </svg>
  );
}
