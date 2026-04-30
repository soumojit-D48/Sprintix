import { redirect } from 'next/navigation'
import { Step1CreateWorkspace } from './step-1-workspace'
import { Step2InviteTeammates } from './step-2-invite'
import { Step3CreateProject } from './step-3-project'

export default function OnboardingPage({ searchParams }: { searchParams: { step?: string } }) {
  const step = parseInt(searchParams.step || '1')

  switch (step) {
    case 1:
      return <Step1CreateWorkspace />
    case 2:
      return <Step2InviteTeammates />
    case 3:
      return <Step3CreateProject />
    default:
      redirect('/onboarding?step=1')
  }
}
