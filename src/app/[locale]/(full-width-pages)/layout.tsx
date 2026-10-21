export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#E9F0F7] dark:bg-gray-900 min-h-screen">{children}</div>;
}
