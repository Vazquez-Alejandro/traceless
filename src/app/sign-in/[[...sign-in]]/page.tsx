import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <>
      <style>{`
        .cl-card, .cl-card [class*="cl-"]:not(.cl-formButtonPrimary) { background-color: #18181b !important; }
        .cl-formButtonPrimary { background-color: #d97706 !important; color: white !important; }
        .cl-formButtonPrimary:hover { background-color: #b45309 !important; }
        .cl-footer { background: #18181b !important; }
        .cl-dividerLine { background-color: #3f3f46 !important; }
        .cl-formFieldInput { background-color: #27272a !important; border-color: #3f3f46 !important; color: #e4e4e7 !important; }
        .cl-headerTitle { color: #e4e4e7 !important; }
        .cl-headerSubtitle { color: #a1a1aa !important; }
        .cl-formFieldLabel { color: #d4d4d8 !important; }
        .cl-footerActionText { color: #a1a1aa !important; }
        .cl-footerActionLink { color: #f59e0b !important; }
        .cl-socialButtonsBlockButton { background-color: #27272a !important; border-color: #3f3f46 !important; color: #e4e4e7 !important; }
        .cl-socialButtonsBlockButton:hover { background-color: #3f3f46 !important; }
        .cl-dividerText { color: #71717a !important; }
        .cl-internal-1hp5nqm, .cl-internal-1f7v04p, .cl-internal-1dtsuqb { background: #18181b !important; }
        .cl-internal-uyu30o { background: transparent !important; }
        [class*="cl-internal-"] { color-scheme: dark !important; }
        .cl-internal-qkucr5, .cl-internal-f7e7j5 { color: #a1a1aa !important; }
      `}</style>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <SignIn
        afterSignInUrl="/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: "bg-amber-600 hover:bg-amber-700 text-white",
          },
        }}
      />
      </div>
    </>
  )
}
