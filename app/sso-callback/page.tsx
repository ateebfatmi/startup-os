import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8]">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
