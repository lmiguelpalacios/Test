import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { learningTasks } from '../../data/learning-tasks'
import {
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_KIND_LABELS,
  LEARNING_TOPIC_LABELS,
  type LearningDifficulty,
  type LearningTopic,
} from '../../types/learning'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function LearningOverview() {
  const { learning, persistWarning } = useAccounting()
  const [topic, setTopic] = useState<'alle' | LearningTopic>('alle')
  const [difficulty, setDifficulty] = useState<'alle' | LearningDifficulty>('alle')

  const progressById = useMemo(() => {
    return new Map(learning.progress.map((item) => [item.taskId, item]))
  }, [learning.progress])

  const completedCount = learning.progress.filter((item) => item.completed).length

  const rows = useMemo(() => {
    return learningTasks
      .filter((task) => (topic === 'alle' ? true : task.topic === topic))
      .filter((task) =>
        difficulty === 'alle' ? true : task.difficulty === difficulty,
      )
      .map((task) => ({
        task,
        progress: progressById.get(task.id),
      }))
  }, [topic, difficulty, progressById])

  const topics = Object.keys(LEARNING_TOPIC_LABELS) as LearningTopic[]

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          'Lernmodus: Antworten werden bewertet, erzeugen aber keine Journalbuchung — außer nach ausdrücklicher Bestätigung einer Übungsübernahme.'
        }
      />
      <PageHeader
        title="Lernmodus"
        subtitle="Buchungsaufgaben mit Musterlösungen (Demo) · lokaler Fortschritt"
        actions={
          <span className="panel-badge">
            <GraduationCap size={14} aria-hidden /> {completedCount}/
            {learningTasks.length} abgeschlossen · {learning.totalPoints} Punkte
          </span>
        }
      />

      <section className="kpi-grid accounting-kpi-grid" aria-label="Lernfortschritt">
        <article className="kpi-card">
          <p className="kpi-label">Aufgaben</p>
          <p className="kpi-value">{learningTasks.length}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Abgeschlossen</p>
          <p className="kpi-value">{completedCount}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Punkte</p>
          <p className="kpi-value">{learning.totalPoints}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Versuche gesamt</p>
          <p className="kpi-value">
            {learning.progress.reduce((sum, item) => sum + item.attempts, 0)}
          </p>
        </article>
      </section>

      <section className="panel">
        <p className="panel-note">
          Musterlösungen sind Lerninhalte. Workspace-Reset in der Buchhaltung löscht auch den
          Lernfortschritt.
        </p>
        <div className="sales-toolbar">
          <label className="form-field">
            <span>Thema</span>
            <select
              value={topic}
              onChange={(event) =>
                setTopic(event.target.value as 'alle' | LearningTopic)
              }
            >
              <option value="alle">Alle Themen</option>
              {topics.map((id) => (
                <option key={id} value={id}>
                  {LEARNING_TOPIC_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Schwierigkeit</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as 'alle' | LearningDifficulty)
              }
            >
              <option value="alle">Alle</option>
              {(Object.keys(LEARNING_DIFFICULTY_LABELS) as LearningDifficulty[]).map(
                (id) => (
                  <option key={id} value={id}>
                    {LEARNING_DIFFICULTY_LABELS[id]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Aufgabe</th>
                <th>Art</th>
                <th>Thema</th>
                <th>Stufe</th>
                <th>Status</th>
                <th className="num">Punkte</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ task, progress }) => (
                <tr key={task.id}>
                  <td>{task.number}</td>
                  <td>
                    <Link className="text-link" to={`/lernmodus/aufgaben/${task.id}`}>
                      {task.title}
                    </Link>
                  </td>
                  <td>{LEARNING_KIND_LABELS[task.kind]}</td>
                  <td>{LEARNING_TOPIC_LABELS[task.topic]}</td>
                  <td>{LEARNING_DIFFICULTY_LABELS[task.difficulty]}</td>
                  <td>
                    {progress?.completed ? (
                      <span className="status-badge paid">abgeschlossen</span>
                    ) : progress ? (
                      <span className="status-badge open">offen · {progress.attempts}×</span>
                    ) : (
                      <span className="muted">nicht begonnen</span>
                    )}
                  </td>
                  <td className="num">
                    {progress ? `${progress.bestScore}/${task.maxPoints}` : `—/${task.maxPoints}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
