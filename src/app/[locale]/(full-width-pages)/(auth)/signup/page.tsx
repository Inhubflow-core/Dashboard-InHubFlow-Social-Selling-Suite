import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "InhubFlow | AI-Powered Social Selling Assistant",
  },
  description: "Crea tu cuenta en InhubFlow | AI-Powered Social Selling Assistant.",
};

export default function SignUp() {
  return <SignUpForm />;
}
