export interface ComposeCodegenOptions {
  /**
   * When false (Hybrid default), emits 100% stable Material 3 Compose APIs with inline M3E comments.
   * When true, opts into M3 Expressive alpha APIs (LoadingIndicator, WavyProgressIndicator, MaterialExpressiveTheme).
   */
  m3Expressive?: boolean;
}

export interface GeneratedKotlinFile {
  path: string;
  shortName: string;
  category: "theme" | "screen" | "navigation" | "app";
  content: string;
}

export interface ComposeDiagnostic {
  severity: "warning" | "info";
  screenId?: string;
  nodeId?: string;
  message: string;
}

export interface ComposeCodegenResult {
  packageName: string;
  files: GeneratedKotlinFile[];
  diagnostics: ComposeDiagnostic[];
}
