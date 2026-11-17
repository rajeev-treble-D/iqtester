import { FigureSvg } from './FigureSvg';

/** The drawn part of a question: a grid of figures, a pattern with a gap, or one reference figure. */
export function PromptView({ prompt }) {
  switch (prompt.kind) {
    case 'matrix':
      return (
        <div
          className="matrix"
          style={{ '--cols': prompt.cols }}
          role="img"
          aria-label="Grid of figures with one missing"
        >
          {prompt.cells.map((cell, i) =>
            cell ? (
              <div className="matrix__cell" key={i}>
                <FigureSvg figure={cell} />
              </div>
            ) : (
              <div className="matrix__cell matrix__cell--missing" key={i}>
                ?
              </div>
            ),
          )}
        </div>
      );

    case 'pattern': {
      const { hole } = prompt;
      return (
        <div className="pattern" role="img" aria-label="Pattern with a missing piece">
          <FigureSvg figure={prompt.figure}>
            <rect className="pattern__hole" x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={3} />
            <text
              className="pattern__mark"
              x={hole.x + hole.w / 2}
              y={hole.y + hole.h / 2}
              fontSize={hole.h * 0.6}
              textAnchor="middle"
              dominantBaseline="central"
            >
              ?
            </text>
          </FigureSvg>
        </div>
      );
    }

    case 'figure':
      return (
        <div className="reference" role="img" aria-label="Reference figure">
          <FigureSvg figure={prompt.figure} />
        </div>
      );
  }
}
