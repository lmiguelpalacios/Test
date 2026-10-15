import { Outlet } from 'react-router-dom'
import { LearningOverview } from '../components/lernmodus/LearningOverview'
import { LearningTaskDetail } from '../components/lernmodus/LearningTaskDetail'

export function LernmodusLayout() {
  return <Outlet />
}

export function LernmodusOverviewPage() {
  return <LearningOverview />
}

export function LernmodusTaskPage() {
  return <LearningTaskDetail />
}
