import { DEFAULT_THEME } from "../theme/tokens.ts";
import { createBlankScreen, createId, uniformSpacing } from "./factory.ts";
import type { AppProject } from "./types.ts";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  build: () => AppProject;
}

function buildMaterialShowcase(): AppProject {
  const homeId = "scr_home";
  const exploreId = "scr_explore";
  const profileId = "scr_profile";
  const settingsId = "scr_settings";

  const homeScreen = createBlankScreen("Home", "home", {
    id: homeId,
    showBottomNav: true,
    topBarProps: {
      variant: "small",
      title: "M3 Studio",
      subtitle: "Expressive Showcase",
      navigationIcon: "menu",
      navigationAction: { type: "showSnackbar", message: "Drawer opens here" },
      actions: [
        {
          id: "act_settings",
          icon: "settings",
          label: "Settings",
          action: { type: "navigate", targetScreenId: settingsId, transition: "slide" },
        },
      ],
    },
    fab: {
      type: "FloatingActionButton",
      name: "Compose FAB",
      props: {
        variant: "extended",
        icon: "edit",
        label: "Compose",
        colorRole: "tertiaryContainer",
      },
      action: { type: "showSnackbar", message: "Compose action tapped!" },
    },
    bodyChildren: [
      {
        type: "Card",
        name: "Hero Card",
        style: { width: "fill", backgroundToken: "primaryContainer", padding: uniformSpacing(16) },
        props: { variant: "filled", gap: 6 },
        children: [
          {
            type: "Badge",
            props: { label: "MATERIAL 3 EXPRESSIVE", colorRole: "primary" },
          },
          {
            type: "Text",
            props: {
              text: "Design Native Android UI",
              role: "headlineSmall",
              colorToken: "onPrimaryContainer",
              align: "left",
            },
          },
          {
            type: "Text",
            props: {
              text: "Tweak theme seeds, fonts, shapes, and inspect every screen live.",
              role: "bodyMedium",
              colorToken: "onPrimaryContainer",
              align: "left",
            },
          },
        ],
      },
      {
        type: "Row",
        name: "Connected Actions",
        style: { width: "fill" },
        props: {
          gap: 3,
          verticalAlignment: "center",
          horizontalArrangement: "start",
          wrap: false,
          connected: true,
        },
        children: [
          {
            type: "Button",
            style: { width: "fill" },
            props: { label: "Explore", variant: "filled", icon: "explore", enabled: true },
            action: { type: "navigate", targetScreenId: exploreId, transition: "fade" },
          },
          {
            type: "Button",
            style: { width: "fill" },
            props: { label: "Settings", variant: "tonal", icon: "tune", enabled: true },
            action: { type: "navigate", targetScreenId: settingsId, transition: "slide" },
          },
        ],
      },
      {
        type: "Card",
        name: "Interactive Controls Card",
        style: { width: "fill", padding: uniformSpacing(14) },
        props: { variant: "outlined", gap: 10 },
        children: [
          {
            type: "ListItem",
            props: {
              headline: "Smart Alerts",
              supportingText: "Real-time notifications & badges",
              leadingIcon: "notifications_active",
              leadingStyle: "avatar",
              trailingType: "switch",
              checked: true,
            },
          },
          {
            type: "Divider",
            props: { thickness: 1, inset: false },
          },
          {
            type: "Slider",
            props: { label: "Elevation Intensity", value: 65, min: 0, max: 100 },
          },
          {
            type: "TextField",
            props: {
              label: "Quick Search",
              placeholder: "Search Material parts...",
              value: "",
              variant: "outlined",
              leadingIcon: "search",
            },
          },
        ],
      },
    ],
  });

  const exploreScreen = createBlankScreen("Explore", "explore", {
    id: exploreId,
    showBottomNav: true,
    topBarProps: {
      variant: "centerAligned",
      title: "Explore Components",
      actions: [],
    },
    bodyChildren: [
      {
        type: "Row",
        name: "Filter Chips",
        style: { width: "fill" },
        props: { gap: 8, verticalAlignment: "center", horizontalArrangement: "start", wrap: true, connected: false },
        children: [
          { type: "Chip", props: { label: "All", variant: "filter", icon: "apps", selected: true } },
          { type: "Chip", props: { label: "Expressive", variant: "filter", icon: "auto_awesome", selected: false } },
          { type: "Chip", props: { label: "Inputs", variant: "assist", icon: "toggle_on", selected: false } },
        ],
      },
      {
        type: "Card",
        name: "M3E Motion Showcase",
        style: { width: "fill", padding: uniformSpacing(16) },
        props: { variant: "elevated", gap: 12 },
        children: [
          {
            type: "Row",
            style: { width: "fill" },
            props: { gap: 12, verticalAlignment: "center", horizontalArrangement: "start", wrap: false, connected: false },
            children: [
              { type: "LoadingIndicator", props: { size: 44, contained: true } },
              {
                type: "Column",
                style: { width: "fill", padding: uniformSpacing(0) },
                props: { gap: 2, scrollable: false, horizontalAlignment: "start", verticalArrangement: "top", connected: false },
                children: [
                  { type: "Text", props: { text: "Shape-Morphing Loader", role: "titleMedium", colorToken: "onSurface", align: "left" } },
                  { type: "Text", props: { text: "Ported M3 Expressive progress physics", role: "bodySmall", colorToken: "onSurfaceVariant", align: "left" } },
                ],
              },
            ],
          },
          {
            type: "ProgressBar",
            props: { variant: "linear", determinate: true, value: 72, wavy: true },
          },
        ],
      },
      {
        type: "Image",
        props: {
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
          alt: "Abstract Material wallpaper",
          aspectRatio: "16:9",
          contentScale: "cover",
          shape: "rounded",
        },
      },
    ],
  });

  const profileScreen = createBlankScreen("Profile", "profile", {
    id: profileId,
    showBottomNav: true,
    topBarProps: {
      variant: "small",
      title: "Profile",
      actions: [
        {
          id: "act_prof_settings",
          icon: "settings",
          label: "Settings",
          action: { type: "navigate", targetScreenId: settingsId, transition: "slide" },
        },
      ],
    },
    bodyChildren: [
      {
        type: "Card",
        style: { width: "fill", backgroundToken: "secondaryContainer", padding: uniformSpacing(16) },
        props: { variant: "filled", gap: 8 },
        children: [
          {
            type: "Row",
            style: { width: "fill" },
            props: { gap: 12, verticalAlignment: "center", horizontalArrangement: "start", wrap: false, connected: false },
            children: [
              { type: "Icon", props: { name: "account_circle", size: 48, fill: true, colorToken: "primary" } },
              {
                type: "Column",
                style: { width: "fill", padding: uniformSpacing(0) },
                props: { gap: 2, scrollable: false, horizontalAlignment: "start", verticalArrangement: "top", connected: false },
                children: [
                  { type: "Text", props: { text: "Alex Mercer", role: "titleLarge", colorToken: "onSecondaryContainer", align: "left" } },
                  { type: "Text", props: { text: "Android Material Designer", role: "bodyMedium", colorToken: "onSecondaryContainer", align: "left" } },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "ListItem",
        props: {
          headline: "App Preferences",
          supportingText: "Customize theme, fonts & navigation",
          leadingIcon: "tune",
          leadingStyle: "avatar",
          trailingType: "icon",
          trailingIcon: "chevron_right",
        },
        action: { type: "navigate", targetScreenId: settingsId, transition: "slide" },
      },
    ],
  });

  const settingsScreen = createBlankScreen("Settings", "settings", {
    id: settingsId,
    showBottomNav: false,
    topBarProps: {
      variant: "small",
      title: "Settings",
      navigationIcon: "arrow_back",
      navigationAction: { type: "navigateBack" },
      actions: [],
    },
    bodyChildren: [
      {
        type: "Text",
        props: { text: "General", role: "labelLarge", colorToken: "primary", align: "left" },
      },
      {
        type: "ListItem",
        props: {
          headline: "Dynamic Color",
          supportingText: "Adapt app palette from device wallpaper",
          leadingIcon: "palette",
          leadingStyle: "icon",
          trailingType: "switch",
          checked: true,
        },
      },
      {
        type: "ListItem",
        props: {
          headline: "Haptic Feedback",
          supportingText: "Vibrate on expressive button presses",
          leadingIcon: "vibration",
          leadingStyle: "icon",
          trailingType: "switch",
          checked: false,
        },
      },
      {
        type: "Divider",
        props: { thickness: 1, inset: true },
      },
      {
        type: "Button",
        style: { width: "fill" },
        props: { label: "Back to Home", variant: "tonal", icon: "arrow_back", enabled: true },
        action: { type: "navigateBack" },
      },
    ],
  });

  return {
    schemaVersion: 1,
    id: createId("proj"),
    name: "Material Showcase",
    packageName: "com.example.m3showcase",
    theme: { ...DEFAULT_THEME },
    bottomNav: {
      enabled: true,
      destinations: [
        { id: "nav_home", label: "Home", icon: "home", targetScreenId: homeId },
        { id: "nav_explore", label: "Explore", icon: "explore", targetScreenId: exploreId },
        { id: "nav_profile", label: "Profile", icon: "person", targetScreenId: profileId },
      ],
    },
    screens: [homeScreen, exploreScreen, profileScreen, settingsScreen],
    initialScreenId: homeId,
  };
}

function buildSettingsApp(): AppProject {
  const mainId = "scr_prefs";
  const screen = createBlankScreen("Settings", "settings", {
    id: mainId,
    showBottomNav: false,
    topBarProps: {
      variant: "large",
      title: "System Settings",
      navigationIcon: "arrow_back",
      actions: [{ id: "a1", icon: "search", label: "Search" }],
    },
    bodyChildren: [
      {
        type: "TextField",
        props: {
          label: "Search settings",
          placeholder: "Wi-Fi, Display, Notifications...",
          value: "",
          variant: "filled",
          leadingIcon: "search",
        },
      },
      {
        type: "Column",
        name: "Settings Group",
        style: { width: "fill", padding: uniformSpacing(0) },
        props: {
          gap: 3,
          scrollable: false,
          horizontalAlignment: "start",
          verticalArrangement: "top",
          connected: true,
        },
        children: [
          {
            type: "ListItem",
            props: {
              headline: "Network & internet",
              supportingText: "Mobile, Wi-Fi, hotspot",
              leadingIcon: "wifi",
              leadingStyle: "avatar",
              trailingType: "icon",
              trailingIcon: "chevron_right",
            },
          },
          {
            type: "ListItem",
            props: {
              headline: "Display & touch",
              supportingText: "Dark theme, font size, colors",
              leadingIcon: "brightness_6",
              leadingStyle: "avatar",
              trailingType: "switch",
              checked: true,
            },
          },
          {
            type: "ListItem",
            props: {
              headline: "Sound & vibration",
              supportingText: "Volume, haptics, Do Not Disturb",
              leadingIcon: "volume_up",
              leadingStyle: "avatar",
              trailingType: "icon",
              trailingIcon: "chevron_right",
            },
          },
        ],
      },
    ],
  });

  return {
    schemaVersion: 1,
    id: createId("proj"),
    name: "Android Settings",
    packageName: "com.example.settings",
    theme: { ...DEFAULT_THEME, paletteKey: "blue", seedColor: "#0B57D0" },
    bottomNav: { enabled: false, destinations: [] },
    screens: [screen],
    initialScreenId: mainId,
  };
}

function buildAuthFlow(): AppProject {
  const signInId = "scr_signin";
  const signUpId = "scr_signup";

  const signIn = createBlankScreen("Sign In", "signin", {
    id: signInId,
    showBottomNav: false,
    withTopBar: false,
    bodyChildren: [
      { type: "Spacer", props: { size: 24 } },
      { type: "Icon", props: { name: "lock_person", size: 48, fill: true, colorToken: "primary" } },
      { type: "Text", props: { text: "Welcome back", role: "headlineMedium", colorToken: "onSurface", align: "left" } },
      { type: "Text", props: { text: "Sign in to continue to your workspace.", role: "bodyMedium", colorToken: "onSurfaceVariant", align: "left" } },
      { type: "TextField", props: { label: "Email", placeholder: "alex@studio.dev", value: "", variant: "outlined", leadingIcon: "mail" } },
      { type: "TextField", props: { label: "Password", placeholder: "••••••••", value: "", variant: "outlined", leadingIcon: "key" } },
      { type: "Checkbox", props: { label: "Remember this device", checked: true } },
      {
        type: "Button",
        style: { width: "fill" },
        props: { label: "Sign In", variant: "filled", enabled: true },
        action: { type: "showSnackbar", message: "Signed in!" },
      },
      {
        type: "Button",
        style: { width: "fill" },
        props: { label: "Create an account", variant: "text", enabled: true },
        action: { type: "navigate", targetScreenId: signUpId, transition: "slide" },
      },
    ],
  });

  const signUp = createBlankScreen("Create Account", "signup", {
    id: signUpId,
    showBottomNav: false,
    topBarProps: {
      variant: "small",
      title: "Create Account",
      navigationIcon: "arrow_back",
      navigationAction: { type: "navigateBack" },
    },
    bodyChildren: [
      { type: "TextField", props: { label: "Full Name", placeholder: "Alex Mercer", value: "", variant: "outlined", leadingIcon: "person" } },
      { type: "TextField", props: { label: "Email", placeholder: "alex@studio.dev", value: "", variant: "outlined", leadingIcon: "mail" } },
      { type: "TextField", props: { label: "Password", placeholder: "At least 8 characters", value: "", variant: "outlined", leadingIcon: "key" } },
      {
        type: "Button",
        style: { width: "fill" },
        props: { label: "Continue", variant: "filled", icon: "arrow_forward", enabled: true },
        action: { type: "navigateBack" },
      },
    ],
  });

  return {
    schemaVersion: 1,
    id: createId("proj"),
    name: "Auth Flow",
    packageName: "com.example.auth",
    theme: { ...DEFAULT_THEME, paletteKey: "teal", seedColor: "#00696E" },
    bottomNav: { enabled: false, destinations: [] },
    screens: [signIn, signUp],
    initialScreenId: signInId,
  };
}

function buildBlankApp(): AppProject {
  const homeId = "scr_blank_home";
  const home = createBlankScreen("Home", "home", {
    id: homeId,
    showBottomNav: true,
    topBarProps: { title: "My App" },
    bodyChildren: [
      {
        type: "Text",
        props: {
          text: "Start designing your Android screen",
          role: "titleMedium",
          colorToken: "onSurfaceVariant",
          align: "left",
        },
      },
    ],
  });

  return {
    schemaVersion: 1,
    id: createId("proj"),
    name: "Blank App",
    packageName: "com.example.myapp",
    theme: { ...DEFAULT_THEME },
    bottomNav: {
      enabled: true,
      destinations: [{ id: "nav_home", label: "Home", icon: "home", targetScreenId: homeId }],
    },
    screens: [home],
    initialScreenId: homeId,
  };
}

function buildTodoApp(): AppProject {
  const tasksId = "scr_tasks";
  const editId = "scr_task_edit";

  const tasksScreen = createBlankScreen("Tasks", "tasks", {
    id: tasksId,
    showBottomNav: false,
    topBarProps: {
      variant: "small",
      title: "My Tasks",
      subtitle: "{{count.todos}} total tasks",
      actions: [],
    },
    fab: {
      type: "FloatingActionButton",
      name: "New Task FAB",
      props: {
        variant: "extended",
        icon: "add",
        label: "New Task",
        colorRole: "primaryContainer",
      },
      action: {
        type: "selectItem",
        collectionKey: "todos",
        targetStateKey: "editingId",
        populateState: {
          draftTitle: "title",
          draftNotes: "notes",
          draftPriority: "priority",
        },
        targetScreenId: editId,
        transition: "slide",
      },
    },
    bodyChildren: [
      {
        type: "SearchBar",
        name: "Search Tasks",
        style: { width: "fill" },
        props: {
          placeholder: "Search tasks...",
          value: "",
          leadingIcon: "search",
          showClearButton: true,
        },
        bindings: { stateKey: "searchQuery" },
      },
      {
        type: "SegmentedButton",
        name: "Status Filter",
        style: { width: "fill" },
        props: {
          options: [
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "done", label: "Done" },
          ],
          selectedValue: "all",
        },
        bindings: { stateKey: "filterStatus" },
      },
      {
        type: "SegmentedButton",
        name: "Sort Order",
        style: { width: "fill" },
        props: {
          options: [
            { value: "newest", label: "Newest" },
            { value: "az", label: "A–Z" },
            { value: "priority", label: "Priority" },
          ],
          selectedValue: "newest",
        },
        bindings: { stateKey: "sortOrder" },
      },
      {
        type: "Row",
        name: "Quick Add Row",
        style: { width: "fill" },
        props: {
          gap: 8,
          verticalAlignment: "center",
          horizontalArrangement: "start",
          wrap: false,
          connected: false,
        },
        children: [
          {
            type: "TextField",
            style: { width: "fill" },
            props: {
              label: "Quick Task",
              placeholder: "Add a new task...",
              value: "",
              variant: "outlined",
            },
            bindings: { stateKey: "quickTitle" },
          },
          {
            type: "Button",
            props: { label: "Add", variant: "filled", enabled: true },
            action: {
              type: "createItem",
              collectionKey: "todos",
              fieldFromState: { title: "quickTitle" },
              clearStateKeys: ["quickTitle"],
              snackbarMessage: "Task added",
            },
          },
        ],
      },
      {
        type: "DataList",
        name: "Todo List",
        style: { width: "fill" },
        props: {
          collectionKey: "todos",
          searchStateKey: "searchQuery",
          searchFields: ["title", "notes"],
          filterField: "completed",
          filterStateKey: "filterStatus",
          sortStateKey: "sortOrder",
          gap: 8,
          emptyTitle: "No tasks match your filter",
          emptySubtitle: "Try clearing search or adding a new task.",
        },
        children: [
          {
            type: "Card",
            name: "Todo Card",
            style: { width: "fill", padding: uniformSpacing(12) },
            props: { variant: "outlined", gap: 6 },
            children: [
              {
                type: "Row",
                style: { width: "fill" },
                props: {
                  gap: 10,
                  verticalAlignment: "center",
                  horizontalArrangement: "start",
                  wrap: false,
                  connected: false,
                },
                children: [
                  {
                    type: "Checkbox",
                    props: { label: "", checked: false },
                    bindings: { itemField: "completed" },
                    action: {
                      type: "toggleItemField",
                      collectionKey: "todos",
                      field: "completed",
                    },
                  },
                  {
                    type: "Column",
                    style: { width: "fill", padding: uniformSpacing(0) },
                    props: {
                      gap: 2,
                      scrollable: false,
                      horizontalAlignment: "start",
                      verticalArrangement: "top",
                      connected: false,
                    },
                    action: {
                      type: "selectItem",
                      collectionKey: "todos",
                      targetStateKey: "editingId",
                      populateState: {
                        draftTitle: "title",
                        draftNotes: "notes",
                        draftPriority: "priority",
                      },
                      targetScreenId: editId,
                      transition: "slide",
                    },
                    children: [
                      {
                        type: "Text",
                        props: {
                          text: "{{item.title}}",
                          role: "titleMedium",
                          colorToken: "onSurface",
                          align: "left",
                        },
                      },
                      {
                        type: "Text",
                        props: {
                          text: "{{item.notes}}",
                          role: "bodySmall",
                          colorToken: "onSurfaceVariant",
                          align: "left",
                        },
                      },
                    ],
                  },
                  {
                    type: "Badge",
                    props: { label: "{{item.priority}}", colorRole: "tertiaryContainer" },
                  },
                  {
                    type: "IconButton",
                    props: { icon: "delete", variant: "standard", toggleable: false },
                    action: {
                      type: "deleteItem",
                      collectionKey: "todos",
                      snackbarMessage: "Task deleted",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const editScreen = createBlankScreen("Task Details", "task_details", {
    id: editId,
    showBottomNav: false,
    topBarProps: {
      variant: "small",
      title: "Task Details",
      navigationIcon: "arrow_back",
      navigationAction: { type: "navigateBack" },
      actions: [],
    },
    bodyChildren: [
      {
        type: "TextField",
        style: { width: "fill" },
        props: {
          label: "Title",
          placeholder: "Enter task title...",
          value: "",
          variant: "outlined",
        },
        bindings: { stateKey: "draftTitle" },
      },
      {
        type: "TextField",
        style: { width: "fill" },
        props: {
          label: "Notes",
          placeholder: "Optional task details...",
          value: "",
          variant: "outlined",
        },
        bindings: { stateKey: "draftNotes" },
      },
      {
        type: "Text",
        props: {
          text: "Priority",
          role: "labelLarge",
          colorToken: "primary",
          align: "left",
        },
      },
      {
        type: "SegmentedButton",
        style: { width: "fill" },
        props: {
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ],
          selectedValue: "medium",
        },
        bindings: { stateKey: "draftPriority" },
      },
      {
        type: "Row",
        style: { width: "fill" },
        props: {
          gap: 10,
          verticalAlignment: "center",
          horizontalArrangement: "start",
          wrap: false,
          connected: false,
        },
        children: [
          {
            type: "Button",
            style: { width: "fill" },
            props: { label: "Save Task", variant: "filled", icon: "check", enabled: true },
            action: {
              type: "updateItem",
              collectionKey: "todos",
              idStateKey: "editingId",
              fieldFromState: {
                title: "draftTitle",
                notes: "draftNotes",
                priority: "draftPriority",
              },
              createIfMissing: true,
              clearStateKeys: ["editingId", "draftTitle", "draftNotes"],
              navigateBackAfter: true,
              snackbarMessage: "Task saved!",
            },
          },
          {
            type: "Button",
            style: { width: "fill" },
            props: { label: "Delete", variant: "outlined", icon: "delete", enabled: true },
            action: {
              type: "deleteItem",
              collectionKey: "todos",
              idStateKey: "editingId",
              navigateBackAfter: true,
              snackbarMessage: "Task deleted",
            },
          },
        ],
      },
    ],
  });

  return {
    schemaVersion: 1,
    id: "proj_todo_starter",
    name: "Todo & Tasks",
    packageName: "com.example.todoapp",
    theme: { ...DEFAULT_THEME, paletteKey: "teal", seedColor: "#00696E" },
    bottomNav: { enabled: false, destinations: [] },
    screens: [tasksScreen, editScreen],
    initialScreenId: tasksId,
    state: {
      persistenceBackend: "datastore",
      variables: [
        { key: "searchQuery", label: "Search Query", type: "string", defaultValue: "", persist: false },
        { key: "filterStatus", label: "Filter Status", type: "string", defaultValue: "all", persist: true },
        { key: "sortOrder", label: "Sort Order", type: "string", defaultValue: "newest", persist: true },
        { key: "quickTitle", label: "Quick Task Title", type: "string", defaultValue: "", persist: false },
        { key: "editingId", label: "Editing Task ID", type: "string", defaultValue: "", persist: false },
        { key: "draftTitle", label: "Draft Title", type: "string", defaultValue: "", persist: false },
        { key: "draftNotes", label: "Draft Notes", type: "string", defaultValue: "", persist: false },
        { key: "draftPriority", label: "Draft Priority", type: "string", defaultValue: "medium", persist: false },
      ],
      collections: [
        {
          key: "todos",
          label: "Tasks",
          itemLabel: "Task",
          persist: true,
          fields: [
            { key: "title", label: "Title", type: "string" },
            { key: "notes", label: "Notes", type: "string" },
            { key: "completed", label: "Completed", type: "boolean" },
            { key: "priority", label: "Priority", type: "string" },
            { key: "createdAt", label: "Created At", type: "number" },
          ],
          initialItems: [
            {
              id: "todo_1",
              title: "Review Material 3 tokens",
              notes: "Check typography scale and seed color contrast",
              completed: false,
              priority: "high",
              createdAt: 1700000003000,
            },
            {
              id: "todo_2",
              title: "Export Android Studio zip",
              notes: "Test Gradle build with DataStore persistence",
              completed: false,
              priority: "medium",
              createdAt: 1700000002000,
            },
            {
              id: "todo_3",
              title: "Ship v0.2.0 Release",
              notes: "Verify PR Playwright E2E gate passed",
              completed: true,
              priority: "low",
              createdAt: 1700000001000,
            },
          ],
        },
      ],
    },
  };
}

export const STARTER_TEMPLATES: TemplateMetadata[] = [
  {
    id: "material-showcase",
    name: "Material Showcase",
    description: "4-screen app with shared bottom nav, connected buttons, cards & settings",
    icon: "auto_awesome",
    build: buildMaterialShowcase,
  },
  {
    id: "todo-app",
    name: "Todo & Tasks",
    description: "2-screen CRUD task manager with live search, filter, sort & persistent storage",
    icon: "checklist",
    build: buildTodoApp,
  },
  {
    id: "settings-app",
    name: "Android Settings",
    description: "Large TopAppBar with connected list groups, switches & search",
    icon: "settings",
    build: buildSettingsApp,
  },
  {
    id: "auth-flow",
    name: "Auth Flow",
    description: "2-screen Sign In & Create Account flow with slide transitions",
    icon: "lock",
    build: buildAuthFlow,
  },
  {
    id: "blank",
    name: "Blank App",
    description: "Clean single-screen starter with Scaffold & TopAppBar",
    icon: "add_box",
    build: buildBlankApp,
  },
];
