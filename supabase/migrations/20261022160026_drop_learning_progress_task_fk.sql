-- Learning tasks are owned by src/data/learning-tasks.ts, not by rows
-- the user creates. learning_progress.task_id referenced learning_tasks(id),
-- so Prüfen failed for any code id that was never seeded (live: lt-13 and
-- lt-14; lt-01..lt-12 were already present).
--
-- Drop the foreign key and keep task_id as text. A seed row per future task
-- would break the next catalog change the same way. RLS is unchanged:
-- authenticated users insert/update only their own progress in an org they
-- belong to. The learning_tasks catalog table stays (read-only seed); the
-- app does not read it.

alter table public.learning_progress
  drop constraint if exists learning_progress_task_id_fkey;

comment on column public.learning_progress.task_id is
  'Code-owned learning task id from src/data/learning-tasks.ts. Not a foreign key.';
