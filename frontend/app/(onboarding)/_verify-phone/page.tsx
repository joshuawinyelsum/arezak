import { redirect } from "next/navigation";

/** Phone OTP is retained only as a future backend capability, not an app step. */
export default function VerifyPhonePage() {
  redirect("/");
}
