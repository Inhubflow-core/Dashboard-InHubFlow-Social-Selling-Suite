export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#e3e7ed] dark:bg-gray-900 min-h-screen">{children}</div>;
}
