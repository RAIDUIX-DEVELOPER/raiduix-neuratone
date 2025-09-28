export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-300">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-10">{children}</div>
    </div>
  );
}
