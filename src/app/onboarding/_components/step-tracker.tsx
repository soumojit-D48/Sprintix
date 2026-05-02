'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OnboardingStepTracker({ currentStep }: { currentStep: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const step = searchParams.get('step')
    if (!step) {
      router.replace('/onboarding?step=1')
    }
  }, [router, searchParams])

  const steps = [
    { number: 1, title: 'Create Workspace' },
    { number: 2, title: 'Invite Team' },
    { number: 3, title: 'Create Project' },
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                currentStep >= step.number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span
              className={`ml-2 text-sm ${
                currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-16 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
