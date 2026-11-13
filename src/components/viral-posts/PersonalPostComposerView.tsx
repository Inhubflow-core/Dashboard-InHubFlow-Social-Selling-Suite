"use client";

import React from "react";
import CreateViralPostView from "./CreateViralPostView";

/**
 * PersonalPostComposerView
 * Enrutador de compatibilidad: redirige y monta el creador de publicaciones unificado.
 */
export default function PersonalPostComposerView(props: {
  onTabChange?: (tab: string) => void;
  hideBreadcrumb?: boolean;
}) {
  return <CreateViralPostView {...props} />;
}
