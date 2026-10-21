export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#E6F4FE] dark:bg-gray-900 min-h-screen">{children}</div>;
}
