import type { AbschlussEvaluationResult } from '../../abschluss/types'

interface AbschlussFeedbackProps {
  evaluation: AbschlussEvaluationResult
}

export function AbschlussFeedback({ evaluation }: AbschlussFeedbackProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Feedback</h2>
        <span className="panel-badge">
          {evaluation.score}/{evaluation.maxPoints} Punkte
        </span>
      </div>
      <p>{evaluation.summary}</p>
      <ul className="placeholder-list">
        {evaluation.criteria.map((criterion) => (
          <li key={criterion.id}>
            <strong>
              {criterion.ok ? '✓' : '✗'} {criterion.label}:
            </strong>{' '}
            {criterion.feedback}
          </li>
        ))}
      </ul>
    </section>
  )
}
