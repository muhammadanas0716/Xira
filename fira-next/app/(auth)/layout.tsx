export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-finance-green/5 via-transparent to-finance-blue/5" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
