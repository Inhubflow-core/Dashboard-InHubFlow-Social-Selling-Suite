"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  CreditCard,
  ShieldCheck,
  Bot,
  Settings,
  LifeBuoy,
  Ticket,
  FileCode,
  Activity,
} from "lucide-react";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";

type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  target?: string;
  subItems?: {
    key: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    target?: string;
  }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    key: "dashboard",
    path: "/",
  },
  {
    icon: <PageIcon />,
    key: "viralPosts",
    subItems: [
      { key: "viralRadar", path: "/viral-posts/radar" },
      { key: "createPost", path: "/viral-posts/create" },
      { key: "postList", path: "/viral-posts/list" },
      { key: "editorialCalendar", path: "/viral-posts/calendar" },
    ],
  },
  {
    icon: <PieChartIcon />,
    key: "signalRadar",
    subItems: [
      { key: "myPosts", path: "/signals/my-posts" },
      { key: "competitorPosts", path: "/signals/competitors" },
      { key: "groupPosts", path: "/signals/groups" },
      { key: "globalPosts", path: "/signals/global" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    key: "campaigns",
    path: "/campaigns",
  },
  {
    icon: <UserCircleIcon />,
    key: "leads",
    subItems: [
      { key: "leadsDirectory", path: "/leads" },
      { key: "leadsLists", path: "/leads/lists" },
    ],
  },
  {
    icon: <ListIcon />,
    key: "inbox",
    path: "/inbox",
  },
  {
    icon: <Bot className="size-5" />,
    key: "sdrAgent",
    path: "/sdr",
  },
  {
    icon: <TableIcon />,
    key: "pipeline",
    subItems: [
      { key: "pipelineKanban", path: "/pipeline" },
      { key: "pipelineCalendar", path: "/pipeline/calendar" },
    ],
  },
];

const settingsItems: NavItem[] = [
  {
    icon: <Settings className="size-5" />,
    key: "settings",
    subItems: [
      { key: "workspaceSettings", path: "/settings" },
      { key: "linkedinAccounts", path: "/linkedin-accounts" },
      { key: "plans", path: "/plans" },
      { key: "securitySettings", path: "/settings/security" },
    ],
  },
];

const supportItems: NavItem[] = [
  {
    icon: <LifeBuoy className="size-5" />,
    key: "helpCenter",
    path: "/support/help-center",
  },
  {
    icon: <Ticket className="size-5" />,
    key: "tickets",
    path: "/support/tickets",
  },
  {
    icon: <FileCode className="size-5" />,
    key: "docs",
    path: "/support/docs",
  },
  {
    icon: <Activity className="size-5" />,
    key: "systemStatus",
    path: "/support/system-status",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { currentUser, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  const isMember = currentUser?.role === "member";
  const visibleNavItems = useMemo(() => {
    if (isMember) {
      return navItems.filter((item) => item.key !== "team");
    }
    return navItems;
  }, [isMember]);

  const visibleSettingsItems = useMemo(() => {
    return settingsItems.map((item) => {
      if (item.subItems) {
        let sub = item.subItems;
        if (isMember) {
          sub = sub.filter((s) => s.key !== "plans");
        }
        return { ...item, subItems: sub };
      }
      return item;
    });
  }, [isMember]);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (path: string) => {
      if (path === "/" && pathname === "/") return true;
      if (path !== "/" && pathname === path) return true;
      if (path !== "/" && pathname.startsWith(path + "/")) return true;
      return false;
    },
    [pathname]
  );

  // Auto-abrir la categoría si la ruta actual coincide con alguno de sus subitems
  useEffect(() => {
    const allItems = [...visibleNavItems, ...visibleSettingsItems, ...supportItems];
    for (const nav of allItems) {
      if (nav.subItems && nav.subItems.some((sub) => isActive(sub.path))) {
        setOpenSubmenus((prev) => {
          if (prev[nav.key]) return prev;
          return { ...prev, [nav.key]: true };
        });
      }
    }
  }, [pathname, isActive, visibleNavItems, visibleSettingsItems]);

  const handleSubmenuToggle = (key: string) => {
    if (!isExpanded && !isHovered) {
      setIsHovered(true);
    }
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  type MenuType = "main" | "settings" | "support";

  const renderMenuItems = (
    itemsList: NavItem[],
    _menuType: MenuType,
  ) => (
    <ul className="flex flex-col gap-1">
      {itemsList.map((nav) => {
        const isOpen = Boolean(openSubmenus[nav.key]);
        const isParentActive = nav.subItems
          ? nav.subItems.some((s) => isActive(s.path))
          : false;

        return (
          <li key={nav.key}>
            {nav.subItems ? (
              <button
                type="button"
                onClick={() => handleSubmenuToggle(nav.key)}
                className={cn(
                  "group menu-item cursor-pointer w-full text-left",
                  isParentActive || isOpen
                    ? "menu-item-active"
                    : "menu-item-inactive",
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start",
                )}
              >
                <span
                  className={cn(
                    isParentActive || isOpen
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive",
                  )}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{t(`items.${nav.key}`)}</span>
                )}
                {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                  <span
                    className={cn(
                      "inset-e-10 absolute ms-auto",
                      isParentActive || isOpen
                        ? "menu-dropdown-badge-active"
                        : "menu-dropdown-badge-inactive",
                      "menu-dropdown-badge",
                    )}
                  >
                    {t("badges.new")}
                  </span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={cn(
                      "ms-auto h-5 w-5 transition-transform duration-200",
                      isOpen ? "rotate-180 text-brand-500" : "",
                    )}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  target={nav.target}
                  className={cn(
                    "group menu-item",
                    isActive(nav.path)
                      ? "menu-item-active"
                      : "menu-item-inactive",
                  )}
                >
                  <span
                    className={cn(
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive",
                    )}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">
                      {t(`items.${nav.key}`)}
                    </span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (
              <div
                className={cn(
                  "transition-all duration-200 ease-in-out overflow-hidden",
                  isOpen && (isExpanded || isHovered || isMobileOpen)
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0"
                )}
              >
                <ul className="ms-9 mt-2 space-y-1">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.key}>
                      <Link
                        href={subItem.path}
                        target={subItem.target}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {t(`items.${subItem.key}`)}
                        <span className="ms-auto flex items-center gap-1">
                          {subItem.new && (
                            <span
                              className={`ms-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              {t("badges.new")}
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ms-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-pro-active"
                                  : "menu-dropdown-badge-pro-inactive"
                              } menu-dropdown-badge-pro`}
                            >
                              {t("badges.pro")}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r -300 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0 rtl:right-0 rtl:left-auto rtl:border-r-0 rtl:border-l dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full"
      } xl:translate-x-0 xl:rtl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div className="flex shrink-0 h-[76px] items-center justify-center border-b -300 dark:border-gray-800 -mx-5 px-5 transition-all duration-300">
        <Link href="/" className="flex items-center justify-center w-full">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center justify-center">
              <Image
                className="dark:hidden h-10 w-auto object-contain transition-all duration-200"
                src="/images/logo/inhubflow-logo-dark.png"
                alt="InHubFlow"
                width={185}
                height={42}
                priority
              />
              <Image
                className="hidden dark:block h-10 w-auto object-contain transition-all duration-200"
                src="/images/logo/inhubflow-logo-light.png"
                alt="InHubFlow"
                width={185}
                height={42}
                priority
              />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Image
                className="dark:hidden h-10 w-10 object-contain"
                src="/images/logo/inhubflow-icon-dark.png"
                alt="InHubFlow"
                width={40}
                height={40}
                priority
              />
              <Image
                className="hidden dark:block h-10 w-10 object-contain"
                src="/images/logo/inhubflow-icon-light.png"
                alt="InHubFlow"
                width={40}
                height={40}
                priority
              />
            </div>
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear pt-3.5">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.menu")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>

              {/* SuperAdmin Link only for Master Admin */}
              {isSuperAdmin && (
                <Link
                  href="/admin/subscribers"
                  title={!isExpanded && !isHovered ? "SuperAdmin" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all mb-2",
                    isActive("/admin/subscribers")
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-amber-600/90 hover:bg-amber-500/10 dark:text-amber-400/90 hover:text-amber-600 dark:hover:text-amber-300",
                    !isExpanded && !isHovered ? "justify-center px-0" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0",
                      isActive("/admin/subscribers")
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    <ShieldCheck className="size-4.5" />
                  </div>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="truncate font-semibold">SuperAdmin</span>
                      <span className="ms-auto text-xs font-extrabold uppercase px-1.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        MASTER
                      </span>
                    </>
                  )}
                </Link>
              )}

              {/* Admin / Team Link for Workspace Owners */}
              {!isMember && (
                <Link
                  href="/team"
                  title={!isExpanded && !isHovered ? "Admin" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all mb-2",
                    isActive("/team")
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-emerald-600/90 hover:bg-emerald-500/10 dark:text-emerald-400/90 hover:text-emerald-600 dark:hover:text-emerald-300",
                    !isExpanded && !isHovered ? "justify-center px-0" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0",
                      isActive("/team")
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    <Users className="size-4.5" />
                  </div>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="truncate font-semibold">Admin</span>
                      <span className="ms-auto text-xs font-extrabold uppercase px-1.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        TEAM
                      </span>
                    </>
                  )}
                </Link>
              )}

              {renderMenuItems(visibleNavItems, "main")}
            </div>

            {/* Grupo Configuración */}
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.settings")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(visibleSettingsItems, "settings")}
            </div>

            {/* Grupo Soporte, Ayuda & Recursos */}
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.support")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(supportItems, "support")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
