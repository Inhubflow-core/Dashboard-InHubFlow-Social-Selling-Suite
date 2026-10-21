export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#d0d9e9] dark:bg-gray-900 min-h-screen">{children}</div>;
}
