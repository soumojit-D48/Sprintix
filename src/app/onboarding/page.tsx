import { redirect } from 'next/navigation'
import { Step1CreateWorkspace } from './step-1-workspace'
import { Step2InviteTeammates } from './step-2-invite'
import { Step3CreateProject } from './step-3-project'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const { step } = await searchParams
  const currentStep = Number(step ?? '1')

  switch (currentStep) {
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
