import { LanguageToggle } from "../language-toggle";
import { ThemeToggle } from "../theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LanguageToggle />
      <ThemeToggle />
      {children}
    </>
  );
}
