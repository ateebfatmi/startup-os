import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-4">
      <SignUp
        forceRedirectUrl="/office"
        signInUrl="/login"
        appearance={{
          elements: {
            formButtonPrimary: "bg-[#173f2b] hover:bg-[#205339] text-[#c8f560] transition-colors",
            card: "shadow-panel rounded-[24px] border border-black/10 bg-[#fffdf7] w-full max-w-md",
          },
        }}
      />
    </div>
  );
}
