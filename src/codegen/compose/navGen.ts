import type { AppProject } from "../../ast/types.ts";
import type { ComposeDiagnostic, GeneratedKotlinFile } from "./types.ts";
import { kotlinString, toMaterialIconRef, toPascalCase } from "./utils.ts";

/** Generate `AppNavHost.kt` (navigation graph + shared BottomNav) and `MainActivity.kt`. */
export function generateNavAndActivityFiles(
  pkg: string,
  project: AppProject,
  screenNameMap: Map<string, string>,
  routeMap: Map<string, string>,
  diagnostics: ComposeDiagnostic[],
  hasAppState = false,
): GeneratedKotlinFile[] {
  const appPascal = toPascalCase(project.name, "M3App");
  const pkgPath = pkg.replace(/\./g, "/");
  const startRoute = routeMap.get(project.initialScreenId) ?? routeMap.get(project.screens[0]?.id ?? "") ?? "home";

  const showNavScreens = new Set(
    project.screens.filter((s) => s.showBottomNav).map((s) => routeMap.get(s.id) ?? ""),
  );

  for (const dest of project.bottomNav.destinations) {
    if (!routeMap.has(dest.targetScreenId)) {
      diagnostics.push({
        severity: "warning",
        message: `Bottom navigation tab "${dest.label}" references missing screen "${dest.targetScreenId}".`,
      });
    }
  }

  const validDestinations = project.bottomNav.destinations.filter((d) => routeMap.has(d.targetScreenId));
  const hasBottomNav = project.bottomNav.enabled && validDestinations.length > 0 && showNavScreens.size > 0;

  const navBarLines = hasBottomNav
    ? [
        `            val navRoutes = setOf(${[...showNavScreens].filter(Boolean).map(kotlinString).join(", ")})`,
        "            val isTablet = maxWidth >= 600.dp",
        "            val showRail = isTablet && (currentRoute in navRoutes)",
        "            val sharedBottomBar: @Composable () -> Unit = {",
        "                if (!isTablet) {",
        "                    NavigationBar {",
        ...validDestinations.flatMap((dest) => {
          const destRoute = routeMap.get(dest.targetScreenId)!;
          return [
            "                        NavigationBarItem(",
            `                            selected = currentRoute == ${kotlinString(destRoute)},`,
            "                            onClick = {",
            `                                if (currentRoute != ${kotlinString(destRoute)}) {`,
            `                                    navController.navigate(${kotlinString(destRoute)}) {`,
            `                                        popUpTo(${kotlinString(startRoute)}) { saveState = true }`,
            "                                        launchSingleTop = true",
            "                                        restoreState = true",
            "                                    }",
            "                                }",
            "                            },",
            `                            icon = { Icon(${toMaterialIconRef(dest.icon)}, contentDescription = ${kotlinString(dest.label)}) },`,
            `                            label = { Text(${kotlinString(dest.label)}) },`,
            "                        )",
          ];
        }),
        "                    }",
        "                }",
        "            }",
      ]
    : ["            val sharedBottomBar: @Composable () -> Unit = {}"];

  const railItemsLines = hasBottomNav
    ? validDestinations.flatMap((dest) => {
        const destRoute = routeMap.get(dest.targetScreenId)!;
        return [
          "                    NavigationRailItem(",
          `                        selected = currentRoute == ${kotlinString(destRoute)},`,
          "                        onClick = {",
          `                            if (currentRoute != ${kotlinString(destRoute)}) {`,
          `                                navController.navigate(${kotlinString(destRoute)}) {`,
          `                                    popUpTo(${kotlinString(startRoute)}) { saveState = true }`,
          "                                    launchSingleTop = true",
          "                                    restoreState = true",
          "                                }",
          "                            }",
          "                        },",
          `                        icon = { Icon(${toMaterialIconRef(dest.icon)}, contentDescription = ${kotlinString(dest.label)}) },`,
          `                        label = { Text(${kotlinString(dest.label)}) },`,
          "                    )",
        ];
      })
    : [];

  const composableEntries = project.screens.flatMap((screen) => {
    const fnName = screenNameMap.get(screen.id)!;
    const route = routeMap.get(screen.id)!;
    const passBottomBar = hasBottomNav && screen.showBottomNav ? "sharedBottomBar" : "{}";
    return [
      `            composable(${kotlinString(route)}) {`,
      `                ${fnName}(`,
      ...(hasAppState ? ["                    appState = appState,"] : []),
      "                    onNavigate = { target -> navController.navigate(target) },",
      "                    onNavigateBack = { navController.popBackStack() },",
      "                    onShowSnackbar = { msg -> scope.launch { snackbarHostState.showSnackbar(msg) } },",
      `                    bottomBar = ${passBottomBar},`,
      "                    snackbarHost = { SnackbarHost(snackbarHostState) },",
      "                )",
      "            }",
    ];
  });

  const navHostLines = [
    `package ${pkg}.ui.navigation`,
    "",
    "import androidx.compose.foundation.layout.Box",
    "import androidx.compose.foundation.layout.BoxWithConstraints",
    "import androidx.compose.foundation.layout.Row",
    "import androidx.compose.foundation.layout.fillMaxHeight",
    "import androidx.compose.foundation.layout.fillMaxSize",
    "import androidx.compose.material.icons.Icons",
    "import androidx.compose.material.icons.automirrored.rounded.*",
    "import androidx.compose.material.icons.rounded.*",
    "import androidx.compose.material3.*",
    "import androidx.compose.runtime.*",
    "import androidx.compose.ui.Modifier",
    "import androidx.compose.ui.unit.dp",
    ...(hasAppState
      ? [
          "import androidx.compose.ui.platform.LocalContext",
          `import ${pkg}.data.createDefaultStateStorage`,
          `import ${pkg}.ui.state.rememberAppStateStore`,
        ]
      : []),
    "import androidx.navigation.compose.NavHost",
    "import androidx.navigation.compose.composable",
    "import androidx.navigation.compose.currentBackStackEntryAsState",
    "import androidx.navigation.compose.rememberNavController",
    `import ${pkg}.ui.screens.*`,
    "import kotlinx.coroutines.launch",
    "",
    "@Composable",
    `fun ${appPascal}NavHost() {`,
    "    val navController = rememberNavController()",
    "    val snackbarHostState = remember { SnackbarHostState() }",
    "    val scope = rememberCoroutineScope()",
    ...(hasAppState
      ? [
          "    val context = LocalContext.current",
          "    val storage = remember(context) { createDefaultStateStorage(context) }",
          "    val appState = rememberAppStateStore(storage)",
        ]
      : []),
    "    val backStackEntry by navController.currentBackStackEntryAsState()",
    "    val currentRoute = backStackEntry?.destination?.route",
    "",
    ...(hasBottomNav
      ? [
          "    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {",
          ...navBarLines.map((l) => l.replace(/^ {4}/, "")),
          "",
          "        Row(modifier = Modifier.fillMaxSize()) {",
          "            if (showRail) {",
          "                NavigationRail(modifier = Modifier.fillMaxHeight()) {",
          ...railItemsLines,
          "                }",
          "            }",
          "            Box(modifier = Modifier.weight(1f).fillMaxHeight()) {",
          `                NavHost(navController = navController, startDestination = ${kotlinString(startRoute)}) {`,
          ...composableEntries.map((l) => `        ${l}`),
          "                }",
          "            }",
          "        }",
          "    }",
        ]
      : [
          "    val sharedBottomBar: @Composable () -> Unit = {}",
          `    NavHost(navController = navController, startDestination = ${kotlinString(startRoute)}) {`,
          ...composableEntries.map((l) => l.replace(/^ {4}/, "")),
          "    }",
        ]),
    "}",
    "",
  ];

  const edgeToEdge = project.theme.systemBars.edgeToEdge;
  const activityLines = [
    `package ${pkg}`,
    "",
    "import android.os.Bundle",
    "import androidx.activity.ComponentActivity",
    "import androidx.activity.compose.setContent",
    ...(edgeToEdge ? ["import androidx.activity.enableEdgeToEdge"] : []),
    "import androidx.compose.foundation.layout.fillMaxSize",
    "import androidx.compose.material3.Surface",
    "import androidx.compose.ui.Modifier",
    `import ${pkg}.ui.navigation.${appPascal}NavHost`,
    `import ${pkg}.ui.theme.${appPascal}Theme`,
    "",
    "class MainActivity : ComponentActivity() {",
    "    override fun onCreate(savedInstanceState: Bundle?) {",
    "        super.onCreate(savedInstanceState)",
    ...(edgeToEdge ? ["        enableEdgeToEdge()"] : []),
    "        setContent {",
    `            ${appPascal}Theme {`,
    "                Surface(modifier = Modifier.fillMaxSize()) {",
    `                    ${appPascal}NavHost()`,
    "                }",
    "            }",
    "        }",
    "    }",
    "}",
    "",
  ];

  return [
    {
      path: `app/src/main/java/${pkgPath}/ui/navigation/AppNavHost.kt`,
      shortName: "AppNavHost.kt",
      category: "navigation",
      content: navHostLines.join("\n"),
    },
    {
      path: `app/src/main/java/${pkgPath}/MainActivity.kt`,
      shortName: "MainActivity.kt",
      category: "app",
      content: activityLines.join("\n"),
    },
  ];
}
