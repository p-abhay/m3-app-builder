import { resolvePalette } from "../../theme/color.ts";
import { FONTS } from "../../theme/fonts.ts";
import { M3_TYPE_SCALE, shapeTokensFor } from "../../theme/tokens.ts";
import type { AppThemeConfig, M3Palette, TypeRole } from "../../theme/types.ts";
import type { GeneratedKotlinFile } from "./types.ts";
import { kotlinColorLiteral, kotlinUnit, toPascalCase } from "./utils.ts";

const COLOR_SCHEME_FIELDS: readonly (keyof Omit<M3Palette, "key" | "label" | "seed">)[] = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "inversePrimary",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "inverseSurface",
  "inverseOnSurface",
  "outline",
  "outlineVariant",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "scrim",
];

function emitColorVals(prefix: string, palette: M3Palette): string[] {
  return COLOR_SCHEME_FIELDS.map(
    (role) => `val ${prefix}${toPascalCase(role)} = ${kotlinColorLiteral(palette[role])}`,
  );
}

function emitSchemeBlock(schemeName: string, builderFn: string, prefix: string): string[] {
  return [
    `val ${schemeName} = ${builderFn}(`,
    ...COLOR_SCHEME_FIELDS.map((role) => `    ${role} = ${prefix}${toPascalCase(role)},`),
    ")",
  ];
}

function fontFamilyExpr(fontKey: AppThemeConfig["displayFont"]): string {
  return fontKey === "robotoSerif" ? "FontFamily.Serif" : "FontFamily.SansSerif";
}

function weightExpr(weight: number): string {
  if (weight >= 700) return "FontWeight.Bold";
  if (weight >= 600) return "FontWeight.SemiBold";
  if (weight >= 500) return "FontWeight.Medium";
  return "FontWeight.Normal";
}

function pkgFile(
  pkg: string,
  shortName: string,
  content: string,
): GeneratedKotlinFile {
  const pkgPath = pkg.replace(/\./g, "/");
  return {
    path: `app/src/main/java/${pkgPath}/ui/theme/${shortName}`,
    shortName,
    category: "theme",
    content,
  };
}

/** Generate `Color.kt`, `Type.kt`, `Shape.kt`, and `Theme.kt` for the active `AppThemeConfig`. */
export function generateThemeFiles(
  pkg: string,
  appName: string,
  theme: AppThemeConfig,
  m3Expressive: boolean,
): GeneratedKotlinFile[] {
  const appPascal = toPascalCase(appName, "M3App");
  const lightPalette = resolvePalette(theme, false);
  const darkPalette = resolvePalette(theme, true);
  const shapes = shapeTokensFor(theme.shapeScale);

  // 1. Color.kt
  const colorLines = [
    `package ${pkg}.ui.theme`,
    "",
    "import androidx.compose.material3.darkColorScheme",
    "import androidx.compose.material3.lightColorScheme",
    "import androidx.compose.ui.graphics.Color",
    "",
    `// Generated from seed ${lightPalette.seed} (${lightPalette.label}) • contrast = ${theme.contrast}`,
    ...emitColorVals("Light", lightPalette),
    "",
    ...emitColorVals("Dark", darkPalette),
    "",
    ...emitSchemeBlock("LightColorScheme", "lightColorScheme", "Light"),
    "",
    ...emitSchemeBlock("DarkColorScheme", "darkColorScheme", "Dark"),
    "",
  ];

  // 2. Type.kt
  const typeRoles = Object.keys(M3_TYPE_SCALE) as TypeRole[];
  const displayMeta = FONTS.find((f) => f.key === theme.displayFont) ?? FONTS[0];
  const bodyMeta = FONTS.find((f) => f.key === theme.bodyFont) ?? FONTS[0];
  const typeLines = [
    `package ${pkg}.ui.theme`,
    "",
    "import androidx.compose.material3.Typography",
    "import androidx.compose.ui.text.TextStyle",
    "import androidx.compose.ui.text.font.FontFamily",
    "import androidx.compose.ui.text.font.FontWeight",
    "import androidx.compose.ui.unit.sp",
    "",
    `// Display font: ${displayMeta.label} | Body font: ${bodyMeta.label} | Scale: ${Math.round(theme.fontScale * 100)}%`,
    `val DisplayFontFamily = ${fontFamilyExpr(theme.displayFont)}`,
    `val BodyFontFamily = ${fontFamilyExpr(theme.bodyFont)}`,
    "",
    "val AppTypography = Typography(",
    ...typeRoles.map((role) => {
      const spec = M3_TYPE_SCALE[role];
      const family = spec.isDisplay ? "DisplayFontFamily" : "BodyFontFamily";
      const wt = weightExpr(theme.emphasizedType ? spec.emphasizedWeight : spec.weight);
      return [
        `    ${role} = TextStyle(`,
        `        fontFamily = ${family},`,
        `        fontWeight = ${wt},`,
        `        fontSize = ${kotlinUnit(spec.size * theme.fontScale, "sp")},`,
        `        lineHeight = ${kotlinUnit(spec.lineHeight * theme.fontScale, "sp")},`,
        `        letterSpacing = ${spec.tracking}.sp,`,
        "    ),",
      ].join("\n");
    }),
    ")",
    "",
  ];

  // 3. Shape.kt
  const shapeLines = [
    `package ${pkg}.ui.theme`,
    "",
    "import androidx.compose.foundation.shape.RoundedCornerShape",
    "import androidx.compose.material3.Shapes",
    "import androidx.compose.ui.unit.dp",
    "",
    `// Shape scale: ${theme.shapeScale}`,
    "val AppShapes = Shapes(",
    `    extraSmall = RoundedCornerShape(${shapes.extraSmall}.dp),`,
    `    small = RoundedCornerShape(${shapes.small}.dp),`,
    `    medium = RoundedCornerShape(${shapes.medium}.dp),`,
    `    large = RoundedCornerShape(${shapes.large}.dp),`,
    `    extraLarge = RoundedCornerShape(${shapes.extraLarge}.dp),`,
    ")",
    "",
  ];

  // 4. Theme.kt
  const defaultDarkExpr =
    theme.mode === "dark" ? "true" : theme.mode === "light" ? "false" : "isSystemInDarkTheme()";
  const themeImports = [
    "import android.os.Build",
    "import androidx.compose.foundation.isSystemInDarkTheme",
    ...(m3Expressive
      ? [
          "import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi",
          "import androidx.compose.material3.MaterialExpressiveTheme",
          "import androidx.compose.material3.MotionScheme",
        ]
      : ["import androidx.compose.material3.MaterialTheme"]),
    "import androidx.compose.material3.dynamicDarkColorScheme",
    "import androidx.compose.material3.dynamicLightColorScheme",
    "import androidx.compose.runtime.Composable",
    "import androidx.compose.ui.platform.LocalContext",
  ];

  const themeCall = m3Expressive
    ? [
        `    val motion = ${
          theme.motion === "expressive" ? "MotionScheme.expressive()" : "MotionScheme.standard()"
        }`,
        "    MaterialExpressiveTheme(",
        "        colorScheme = colorScheme,",
        "        typography = AppTypography,",
        "        shapes = AppShapes,",
        "        motionScheme = motion,",
        "        content = content,",
        "    )",
      ]
    : [
        "    MaterialTheme(",
        "        colorScheme = colorScheme,",
        "        typography = AppTypography,",
        "        shapes = AppShapes,",
        "        content = content,",
        "    )",
      ];

  const themeLines = [
    `package ${pkg}.ui.theme`,
    "",
    ...themeImports,
    "",
    ...(m3Expressive ? ["@OptIn(ExperimentalMaterial3ExpressiveApi::class)"] : []),
    "@Composable",
    `fun ${appPascal}Theme(`,
    `    darkTheme: Boolean = ${defaultDarkExpr},`,
    `    dynamicColor: Boolean = ${theme.useDynamicColor ? "true" : "false"},`,
    "    content: @Composable () -> Unit,",
    ") {",
    "    val colorScheme = when {",
    "        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {",
    "            val context = LocalContext.current",
    "            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)",
    "        }",
    "        darkTheme -> DarkColorScheme",
    "        else -> LightColorScheme",
    "    }",
    "",
    ...themeCall,
    "}",
    "",
  ];

  return [
    pkgFile(pkg, "Color.kt", colorLines.join("\n")),
    pkgFile(pkg, "Type.kt", typeLines.join("\n")),
    pkgFile(pkg, "Shape.kt", shapeLines.join("\n")),
    pkgFile(pkg, "Theme.kt", themeLines.join("\n")),
  ];
}
