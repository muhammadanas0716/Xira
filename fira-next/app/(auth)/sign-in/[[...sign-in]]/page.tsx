import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient-green mb-2">Fira</h1>
        <p className="text-muted-foreground">SEC Filing Intelligence Platform</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card/80 backdrop-blur-sm border border-border shadow-2xl",
          },
        }}
      />
    </div>
  );
}
