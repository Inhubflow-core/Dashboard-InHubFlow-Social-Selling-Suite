import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "InhubFlow | AI-Powered Social Selling Assistant",
  },
  description: "Inicia sesión en InhubFlow | AI-Powered Social Selling Assistant.",
};

export default function SignIn() {
  return <SignInForm />;
}
