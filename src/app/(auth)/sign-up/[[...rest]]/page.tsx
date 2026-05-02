import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: {
            width: '100%',
            maxWidth: '400px',
          },
        },
      }}
      forceRedirectUrl="/onboarding"
      signInUrl="/sign-in"
    />
  )
}
