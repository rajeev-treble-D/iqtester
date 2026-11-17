import { FigureSvg } from './FigureSvg';

export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function Options({ options, selected, disabled, onSelect, pieces = false }) {
  const figures = options.some((o) => o.kind === 'figure');
  return (
    <div
      className={`options ${figures ? 'options--figures' : 'options--text'}`}
      role="group"
      aria-label="Answer options"
    >
      {options.map((option, i) => {
        const key = OPTION_KEYS[i] ?? String(i + 1);
        return (
          <button
            key={i}
            type="button"
            className="option"
            data-selected={selected === i || undefined}
            disabled={disabled}
            onClick={() => onSelect(i)}
            aria-label={option.kind === 'text' ? `${key}: ${option.text}` : `Option ${key}`}
          >
            <span className="option__key" aria-hidden="true">
              {key}
            </span>
            {option.kind === 'text' ? (
              <span className="option__text">{option.text}</span>
            ) : (
              <FigureSvg
                figure={option.figure}
                className={pieces ? 'option__figure option__figure--piece' : 'option__figure'}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
