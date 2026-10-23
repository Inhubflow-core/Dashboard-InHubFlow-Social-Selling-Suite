import { useTranslations } from "next-intl";

export default function SidebarWidget() {
  const t = useTranslations("sidebar.widget");

  return (
    <div className="pb-20">
      <div
        className="
        mx-auto  rounded-lg bg-gray-50 px-4 py-5 text-center dark:bg-white/3"
      >
        <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
        <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
          {t("description")}
        </p>
        <a
          href="/signals/my-posts"
          className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600 transition"
        >
          {t("purchasePlan")}
        </a>
      </div>
    </div>
  );
}
