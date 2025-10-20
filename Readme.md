A sleek, modern React web app (styled with Tailwind CSS) that helps you track monthly work capacity at a glance. Configure your working days, weekends, and custom holidays; the app then computes your **total working days**, **target hours**, and **progress till today**—and lets you enter **logged hours** to see **remaining or advanced hours** instantly.

> Perfect for teams and individuals who plan by month and want a fast, no-fuss capacity view.

✨ Features
----------

*   **Configurable schedule**
    
    *   Choose which weekdays are working vs. weekend.
        
    *   Add one-off **holidays** (full-day) and optional **extra working days** (e.g., special Saturdays).
        
    *   Set **hours per working day** (e.g., 8h/day).
        
*   **Smart monthly tiles**
    
    *   **Total Working Days (Current Month)**
        
    *   **Total Targeted Hours (Current Month)**
        
    *   **Working Days Till Today**
        
    *   **Expected Hours Till Today**
        
*   **Logged Hours input**
    
    *   Type your actual hours logged.
        
    *   Get **Remaining Hours** (if behind) or **Advanced Hours** (if ahead).
        
*   **Modern UI**
    
    *   Tailwind-based, responsive, keyboard accessible, dark-mode ready.
        
*   **Timezone-safe**
    
    *   Uses local timezone to determine “today” and month boundaries.
        

🧮 How Calculations Work
------------------------

Assume:

*   HOURS\_PER\_DAY = configured hours per working day (e.g., 8)
    
*   workingDaysInMonth = count of days in current month that are marked as working, **excluding holidays** and **including any extra working days**
    
*   workingDaysTillToday = count of working days from the 1st of this month up to (and including) today
    
*   loggedHours = user-entered actual hours worked this month
    

Formulas:

*   **Total Targeted Hours (Current Month)**totalTargetHours = workingDaysInMonth \* HOURS\_PER\_DAY
    
*   **Expected Hours Till Today**expectedHoursToDate = workingDaysTillToday \* HOURS\_PER\_DAY
    
*   **Delta (Remaining / Advanced)**delta = loggedHours - expectedHoursToDate
    
    *   If delta < 0 → **Remaining Hours** = Math.abs(delta)
        
    *   If delta >= 0 → **Advanced Hours** = delta
        

Edge cases handled:

*   If **today is a weekend/holiday**, it’s not counted in workingDaysTillToday.
    
*   Holidays outside current month are ignored.
    
*   Supports months beginning/ending mid-week.
    

⚙️ Configuration
----------------

Create a simple settings object (or load from a JSON file / local storage / API):

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   // settings.example.ts  export const settings = {    hoursPerDay: 8,    // 0=Sun, 1=Mon, ... 6=Sat    workingWeekdays: [1, 2, 3, 4, 5], // Mon–Fri are working days    weekendWeekdays: [0, 6],          // Sun, Sat    holidays: [      // ISO date strings (local timezone is used for "today" comparisons)      "2025-10-04",      "2025-10-12"    ],    extraWorkingDays: [      // Optional: dates that are working even if they fall on a weekend      // "2025-10-18"    ],    // Optional: default month (yyyy-mm); if omitted uses current month    defaultMonth: null  };   `

You can expose a **Settings Panel** in-app to change:

*   Hours per day
    
*   Toggle weekdays as working/weekend
    
*   Add/remove holidays and extra working days
    

All settings can be saved/reloaded via localStorage by default.

🖥️ UI Overview
---------------

*   **Header**: Month selector (defaults to current), quick “Today” jump.
    
*   **Tiles Grid**:
    
    *   Total Working Days (Current Month)
        
    *   Total Targeted Hours (Current Month)
        
    *   Working Days Till Today
        
    *   Expected Hours Till Today
        
*   **Logged Hours Card**:
    
    *   Numeric input for loggedHours
        
    *   Result badge: **Remaining Hours** or **Advanced Hours**
        
*   **Settings Drawer/Modal** (optional):
    
    *   Weekday toggles
        
    *   Hours per day input
        
    *   Holiday/Extra Working Day lists with add/remove
        
*   **Accessibility**:
    
    *   Semantic markup, labeled inputs, focus rings, keyboard nav.
        

🚀 Quick Start
--------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   # 1) Create app  npm create vite@latest work-hours-dashboard -- --template react-ts  cd work-hours-dashboard  # 2) Install Tailwind  npm install -D tailwindcss postcss autoprefixer  npx tailwindcss init -p  # 3) Install deps (optional utilities)  npm install date-fns clsx  # 4) Configure Tailwind (tailwind.config.js)  # content: ['./index.html', './src/**/*.{ts,tsx}']  # 5) Start dev server  npm run dev   `

Add Tailwind to your CSS:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   /* src/index.css */  @tailwind base;  @tailwind components;  @tailwind utilities;   `

📂 Suggested Project Structure
------------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   src/    components/      Tiles.tsx      HoursCard.tsx      SettingsPanel.tsx    hooks/      useMonthStats.ts    lib/      calendar.ts        # helpers to build month days, filter working days      config.ts          # load/save settings (localStorage)      compute.ts         # formula utilities    pages/      Dashboard.tsx    settings.example.ts    App.tsx    main.tsx   `

🧩 Key Components
-----------------

*   Accepts calculated values and displays four KPI tiles.
    
*   Input for loggedHours and shows Remaining/Advanced hours feedback.
    
*   Form for schedule configuration and holidays management.
    

🛠️ Implementation Notes
------------------------

*   **Date math**: Use date-fns or native Date APIs to iterate the current month and evaluate each day against:
    
    1.  Is weekday in workingWeekdays?
        
    2.  Is date in holidays? (exclude)
        
    3.  Is date in extraWorkingDays? (include even if weekend)
        
*   **State**: Store settings and loggedHours in component state; persist to localStorage.
    
*   **Performance**: Recompute only when settings, loggedHours, or month changes.
    
*   **i18n/Locale**: Render weekday names via Intl.DateTimeFormat.
    

🧪 Example Usage (Pseudo)
-------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   // Example: compute month stats (October 2025)  const {    workingDaysInMonth,    workingDaysTillToday,    totalTargetHours,    expectedHoursToDate  } = useMonthStats(settings, new Date());  const delta = loggedHours - expectedHoursToDate;  const remaining = delta < 0 ? Math.abs(delta) : 0;  const advanced  = delta >= 0 ? delta : 0;   `

🎯 Roadmap
----------

*   Partial-day holidays (0.5 day)
    
*   Multi-profile presets (e.g., Summer hours)
    
*   CSV export of monthly summary
    
*   API sync (Google Calendar / ICS import)
    
*   Unit tests (Vitest) + storybook
    

🤝 Contributing
---------------

PRs welcome! Please:

1.  Fork & create a feature branch.
    
2.  Add tests for logic in lib/compute.ts.
    
3.  Open a PR with a concise description and screenshots.
    

📜 License
----------

MIT — use it freely, keep the license, and have fun building!