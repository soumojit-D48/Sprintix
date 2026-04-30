import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: {
            width: '100%',
            maxWidth: '400px',
          },
        },
      }}
    />
  )
}
