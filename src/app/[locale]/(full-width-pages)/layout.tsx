export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#EDEDF5] dark:bg-gray-900 min-h-screen">{children}</div>;
}
