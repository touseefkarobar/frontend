import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import {
  authenticateTeamLogger,
  fetchTeamLoggerTotalTime,
  formatDuration,
} from "./services/teamLogger";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SECTION_TABS = [
  {
    key: "overview",
    label: "Home",
    helper: "Pulse overview",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" {...props}>
        <path
          d="M3 9.75L12 3l9 6.75M4.5 10.5v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V10.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "insights",
    label: "Insights",
    helper: "Deep dive data",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" {...props}>
        <path
          d="M3.75 6.75v10.5A2.25 2.25 0 006 19.5h12a2.25 2.25 0 002.25-2.25V6.75M8.25 12V9.75a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75V12m6 0V7.5a.75.75 0 00-.75-.75H10.5a.75.75 0 00-.75.75V12m6 0V6a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    helper: "Tune your calendar",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" {...props}>
        <path
          d="M9.594 3.94c.722-1.257 2.49-1.257 3.212 0l.218.379a1.875 1.875 0 002.082.901l.414-.1c1.44-.347 2.716.93 2.37 2.37l-.1.414a1.875 1.875 0 00.9 2.082l.38.218c1.257.722 1.257 2.49 0 3.212l-.38.218a1.875 1.875 0 00-.9 2.082l.1.414c.347 1.44-.93 2.716-2.37 2.37l-.415-.1a1.875 1.875 0 00-2.081.9l-.219.38c-.722 1.257-2.49 1.257-3.212 0l-.218-.38a1.875 1.875 0 00-2.082-.9l-.414.1c-1.44.347-2.716-.93-2.37-2.37l.1-.415a1.875 1.875 0 00-.9-2.081l-.38-.219c-1.257-.722-1.257-2.49 0-3.212l.38-.218a1.875 1.875 0 00.9-2.082l-.1-.414c-.347-1.44.93-2.716 2.37-2.37l.414.1a1.875 1.875 0 002.082-.9l.218-.38z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const StatTile = ({ label, value, accent }) => (
  <div className="rounded-3xl bg-slate-900/60 p-5 shadow-[0_12px_40px_-20px_rgba(59,130,246,0.6)] ring-1 ring-white/10 backdrop-blur">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${accent}`}
    >
      {value}
    </p>
  </div>
);

const TogglePill = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-200
      ${
        active
          ? "border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 text-white shadow-[0_12px_30px_-15px_rgba(99,102,241,0.8)]"
          : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-indigo-400/50 hover:text-white"
      }`}
  >
    {label}
  </button>
);

const HolidayBadge = ({ date, onRemove }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-sm text-slate-200 backdrop-blur">
    {dayjs(date).format("DD MMM")}
    <button
      type="button"
      onClick={() => onRemove(date)}
      className="rounded-full bg-slate-800/70 p-1 text-xs text-slate-400 transition hover:bg-red-500/30 hover:text-red-100"
      aria-label={`Remove ${date}`}
    >
      ✕
    </button>
  </span>
);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

const DEFAULT_CURRENCY = "USD";
const SALARY_PREFERENCES_KEY = "salaryPreferences";

const formatCurrencyValue = (value, currencyCode) => {
  const safeCurrency =
    currencyCode && typeof currencyCode === "string"
      ? currencyCode.toUpperCase()
      : DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency || DEFAULT_CURRENCY,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: 2,
    }).format(value);
  }
};

const TEAMLOGGER_DEFAULT_FILTERS = {
  startTime: 1759258800000,
  endTime: 1761937199000,
  dayStartCutOff: 0,
  dayEndCutOff: -1,
  suppressDetails: false,
};

const TEAMLOGGER_STORAGE_KEY = "teamLoggerAuth";

function useWorkingCalendar({ weekendDays, holidays, dailyTargetHours }) {
  return useMemo(() => {
    const today = dayjs();
    const startOfMonth = today.startOf("month");
    const endOfMonth = today.endOf("month");

    let workingDaysThisMonth = 0;
    let workingDaysUntilToday = 0;

    for (
      let date = startOfMonth;
      date.isBefore(endOfMonth) || date.isSame(endOfMonth, "day");
      date = date.add(1, "day")
    ) {
      const isWeekend = weekendDays.includes(date.day());
      const isHoliday = holidays.includes(date.format("YYYY-MM-DD"));
      if (isWeekend || isHoliday) continue;

      workingDaysThisMonth += 1;
      if (date.isBefore(today, "day") || date.isSame(today, "day")) {
        workingDaysUntilToday += 1;
      }
    }

    const totalTargetHours = workingDaysThisMonth * dailyTargetHours;
    const expectedHoursByToday = workingDaysUntilToday * dailyTargetHours;

    return {
      totalWorkingDays: workingDaysThisMonth,
      workingDaysToDate: workingDaysUntilToday,
      totalTargetHours,
      expectedHoursByToday,
    };
  }, [weekendDays, holidays, dailyTargetHours]);
}

function App() {
  const [weekendDays, setWeekendDays] = useState([0, 6]);
  const [dailyTargetHours, setDailyTargetHours] = useState(8);
  const [holidayInput, setHolidayInput] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [loggedHours, setLoggedHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.hourlyRate) {
            return String(parsed.hourlyRate);
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return "";
  });
  const [baseSalary, setBaseSalary] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.baseSalary) {
            return String(parsed.baseSalary);
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return "";
  });
  const [salaryCurrency, setSalaryCurrency] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.currency) {
            return String(parsed.currency);
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return DEFAULT_CURRENCY;
  });
  const [enableSalary, setEnableSalary] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.enableSalary === "boolean") {
            return parsed.enableSalary;
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return true;
  });
  const [enableAttendanceBonus, setEnableAttendanceBonus] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.enableAttendanceBonus === "boolean") {
            return parsed.enableAttendanceBonus;
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return true;
  });
  const [enableTimeManagementBonus, setEnableTimeManagementBonus] = useState(
    () => {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (typeof parsed?.enableTimeManagementBonus === "boolean") {
              return parsed.enableTimeManagementBonus;
            }
          } catch {
            window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
          }
        }
      }
      return true;
    }
  );
  const [enableClientBonus, setEnableClientBonus] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.enableClientBonus === "boolean") {
            return parsed.enableClientBonus;
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return true;
  });
  const [enablePerformanceBonus, setEnablePerformanceBonus] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SALARY_PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.enablePerformanceBonus === "boolean") {
            return parsed.enablePerformanceBonus;
          }
        } catch {
          window.localStorage.removeItem(SALARY_PREFERENCES_KEY);
        }
      }
    }
    return true;
  });
  const [showSalary, setShowSalary] = useState(false);
  const [auth, setAuth] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(TEAMLOGGER_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.accessToken) {
            return {
              accessToken: parsed.accessToken,
              tokenType: parsed.tokenType ?? "Bearer",
              account: parsed.account ?? null,
            };
          }
        } catch {
          window.localStorage.removeItem(TEAMLOGGER_STORAGE_KEY);
        }
      }
    }

    return { accessToken: "", tokenType: "Bearer", account: null };
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [teamLoggerLoading, setTeamLoggerLoading] = useState(false);
  const [teamLoggerError, setTeamLoggerError] = useState("");
  const [teamLoggerTotals, setTeamLoggerTotals] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const {
    totalWorkingDays,
    workingDaysToDate,
    totalTargetHours,
    expectedHoursByToday,
  } = useWorkingCalendar({
    weekendDays,
    holidays,
    dailyTargetHours,
  });

  const accountId = auth.account?.id ?? "";
  const companyId = auth.account?.companyId ?? "";
  const accountName = auth.account?.name || auth.account?.username || "";
  const companyName = auth.account?.company?.name || "";
  const token = auth.accessToken;
  const tokenType = auth.tokenType ?? "Bearer";
  const isAuthenticated = Boolean(token && accountId && companyId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (auth.accessToken) {
      window.localStorage.setItem(TEAMLOGGER_STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(TEAMLOGGER_STORAGE_KEY);
    }
  }, [auth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized =
      (salaryCurrency || "").trim().slice(0, 3).toUpperCase() ||
      DEFAULT_CURRENCY;
    window.localStorage.setItem(
      SALARY_PREFERENCES_KEY,
      JSON.stringify({
        hourlyRate: hourlyRate || "",
        baseSalary: baseSalary || "",
        currency: normalized,
        enableSalary,
        enableAttendanceBonus,
        enableTimeManagementBonus,
        enableClientBonus,
        enablePerformanceBonus,
      })
    );
  }, [
    hourlyRate,
    baseSalary,
    salaryCurrency,
    enableSalary,
    enableAttendanceBonus,
    enableTimeManagementBonus,
    enableClientBonus,
    enablePerformanceBonus,
  ]);

  const parsedLoggedHours = parseFloat(loggedHours) || 0;
  const normalizedCurrency =
    (salaryCurrency || "").trim().slice(0, 3).toUpperCase() || DEFAULT_CURRENCY;
  const parsedHourlyRate = parseFloat(hourlyRate) || 0;
  const parsedBaseSalary = parseFloat(baseSalary) || 0;
  const targetHours = Number.isFinite(totalTargetHours)
    ? totalTargetHours
    : 0;
  const expectedMonthlyBase =
    parsedBaseSalary > 0
      ? parsedBaseSalary
      : targetHours > 0 && parsedHourlyRate > 0
      ? parsedHourlyRate * targetHours
      : 0;
  const effectiveHourlyRate =
    parsedBaseSalary > 0 && targetHours > 0
      ? parsedBaseSalary / targetHours
      : parsedHourlyRate;
  const cappedHours =
    targetHours > 0 ? Math.min(parsedLoggedHours, targetHours) : parsedLoggedHours;
  const meetsMonthlyTarget =
    enableSalary && targetHours > 0
      ? Math.abs(parsedLoggedHours - targetHours) < 0.01
      : false;
  const basePay = (() => {
    if (!enableSalary) return 0;
    if (targetHours <= 0) {
      if (parsedBaseSalary > 0) return parsedBaseSalary;
      return effectiveHourlyRate > 0
        ? effectiveHourlyRate * parsedLoggedHours
        : 0;
    }

    if (meetsMonthlyTarget) {
      if (expectedMonthlyBase > 0) return expectedMonthlyBase;
      return effectiveHourlyRate > 0
        ? effectiveHourlyRate * parsedLoggedHours
        : 0;
    }

    if (effectiveHourlyRate > 0) {
      const computed = effectiveHourlyRate * cappedHours;
      if (expectedMonthlyBase > 0) {
        return Math.min(expectedMonthlyBase, computed);
      }
      return computed;
    }

    return 0;
  })();
  const attendanceBonusActive =
    enableSalary &&
    enableAttendanceBonus &&
    meetsMonthlyTarget &&
    expectedMonthlyBase > 0;
  const timeManagementBonusActive =
    enableSalary &&
    enableTimeManagementBonus &&
    meetsMonthlyTarget &&
    expectedMonthlyBase > 0;
  const clientBonusActive =
    enableSalary &&
    enableClientBonus &&
    meetsMonthlyTarget &&
    expectedMonthlyBase > 0;
  const performanceBonusActive =
    enableSalary &&
    enablePerformanceBonus &&
    attendanceBonusActive &&
    timeManagementBonusActive &&
    clientBonusActive;
  const attendanceBonusAmount = attendanceBonusActive
    ? expectedMonthlyBase * 0.05
    : 0;
  const timeManagementBonusAmount = timeManagementBonusActive
    ? expectedMonthlyBase * 0.05
    : 0;
  const clientBonusAmount = clientBonusActive
    ? expectedMonthlyBase * 0.03
    : 0;
  const performanceBonusAmount = performanceBonusActive
    ? expectedMonthlyBase * 0.03
    : 0;
  const bonusSubtotal =
    attendanceBonusAmount +
    timeManagementBonusAmount +
    clientBonusAmount +
    performanceBonusAmount;
  const totalCompensation = enableSalary ? basePay + bonusSubtotal : 0;
  const formattedSalary = formatCurrencyValue(
    totalCompensation,
    normalizedCurrency
  );
  const formattedHourlyRate = effectiveHourlyRate
    ? formatCurrencyValue(effectiveHourlyRate, normalizedCurrency)
    : null;
  const formattedBaseSalary = expectedMonthlyBase
    ? formatCurrencyValue(expectedMonthlyBase, normalizedCurrency)
    : null;
  const formattedAttendanceBonus = attendanceBonusAmount
    ? formatCurrencyValue(attendanceBonusAmount, normalizedCurrency)
    : null;
  const formattedTimeManagementBonus = timeManagementBonusAmount
    ? formatCurrencyValue(timeManagementBonusAmount, normalizedCurrency)
    : null;
  const formattedClientBonus = clientBonusAmount
    ? formatCurrencyValue(clientBonusAmount, normalizedCurrency)
    : null;
  const formattedPerformanceBonus = performanceBonusAmount
    ? formatCurrencyValue(performanceBonusAmount, normalizedCurrency)
    : null;
  const formattedBonusSubtotal = bonusSubtotal
    ? formatCurrencyValue(bonusSubtotal, normalizedCurrency)
    : null;
  const formattedAttendanceBonusFull = formatCurrencyValue(
    attendanceBonusAmount,
    normalizedCurrency
  );
  const formattedTimeManagementBonusFull = formatCurrencyValue(
    timeManagementBonusAmount,
    normalizedCurrency
  );
  const formattedClientBonusFull = formatCurrencyValue(
    clientBonusAmount,
    normalizedCurrency
  );
  const formattedPerformanceBonusFull = formatCurrencyValue(
    performanceBonusAmount,
    normalizedCurrency
  );
  const formattedBasePay = formatCurrencyValue(basePay, normalizedCurrency);
  const formattedBonusSubtotalFull = formatCurrencyValue(
    bonusSubtotal,
    normalizedCurrency
  );
  const hourDelta = parsedLoggedHours - expectedHoursByToday;
  const basePayLabel = meetsMonthlyTarget ? "Base salary" : "Prorated base";
  const hoursStatusLabel =
    hourDelta >= 0 ? "Advanced hours" : "Remaining hours";
  const hoursStatusValue = Math.abs(hourDelta);
  const formattedLoggedHours = formatNumber(parsedLoggedHours);
  const formattedExpectedHours = formatNumber(expectedHoursByToday);
  const workingDaysRemaining = Math.max(
    totalWorkingDays - workingDaysToDate,
    0
  );
  const hoursToTarget = Math.max(totalTargetHours - parsedLoggedHours, 0);
  const currentDateLabel = dayjs().format("ddd, DD MMM");
  const lastSyncLabel = teamLoggerLoading
    ? "Syncing…"
    : lastSyncedAt
    ? dayjs(lastSyncedAt).format("DD MMM YYYY HH:mm")
    : "Awaiting sync";

  const teamLoggerStats = teamLoggerTotals?.stats;
  const formatHoursValue = (hours) =>
    Number.isFinite(hours) ? `${formatNumber(hours)} h` : "—";
  const formatPercentageValue = (ratio) =>
    Number.isFinite(ratio) ? `${formatNumber(ratio * 100)}%` : "—";
  const formatSecondsValue = (seconds) =>
    Number.isFinite(seconds) ? formatDuration(seconds * 1000) : "—";
  const formatTimestamp = (value) =>
    Number.isFinite(value) && value > 0
      ? dayjs(value).format("DD MMM YYYY HH:mm")
      : "—";

  const handleToggleWeekend = (dayIndex) => {
    setWeekendDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((day) => day !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleAddHoliday = () => {
    if (!holidayInput) return;
    const formatted = dayjs(holidayInput).format("YYYY-MM-DD");
    if (!formatted || formatted === "Invalid Date") return;
    setHolidays((prev) =>
      prev.includes(formatted) ? prev : [...prev, formatted].sort()
    );
    setHolidayInput("");
  };

  const handleRemoveHoliday = (date) => {
    setHolidays((prev) => prev.filter((item) => item !== date));
  };

  const handleLoginFieldChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const username = loginForm.username.trim();
    const password = loginForm.password;

    if (!username || !password) {
      setLoginError("Username and password are required.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");
    try {
      const payload = await authenticateTeamLogger({ username, password });
      setAuth({
        accessToken: payload.accessToken,
        tokenType: payload.tokenType ?? "Bearer",
        account: payload.account ?? null,
      });
      setLoginForm({ username: "", password: "" });
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = () => {
    setAuth({ accessToken: "", tokenType: "Bearer", account: null });
    setTeamLoggerTotals(null);
    setTeamLoggerError("");
    setTeamLoggerLoading(false);
    setLoggedHours("");
    setShowSalary(false);
    setLastSyncedAt(null);
    setLoginForm({ username: "", password: "" });
    setLoginError("");
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let ignore = false;

    const fetchReport = async () => {
      setTeamLoggerLoading(true);
      setTeamLoggerError("");
      try {
        const result = await fetchTeamLoggerTotalTime({
          token,
          tokenType,
          companyId,
          accountId,
          startTime: TEAMLOGGER_DEFAULT_FILTERS.startTime,
          endTime: TEAMLOGGER_DEFAULT_FILTERS.endTime,
          dayStartCutOff: TEAMLOGGER_DEFAULT_FILTERS.dayStartCutOff,
          dayEndCutOff: TEAMLOGGER_DEFAULT_FILTERS.dayEndCutOff,
          suppressDetails: TEAMLOGGER_DEFAULT_FILTERS.suppressDetails,
        });

        if (ignore) return;

        setTeamLoggerTotals(result);
        setLastSyncedAt(Date.now());

        const onComputerHours = result?.stats?.onComputerHours;
        if (Number.isFinite(onComputerHours)) {
          setLoggedHours((prev) => {
            const next = String(onComputerHours);
            return prev === next ? prev : next;
          });
        }
      } catch (error) {
        if (ignore) return;
        setTeamLoggerTotals(null);
        setTeamLoggerError(error.message);
      } finally {
        if (!ignore) {
          setTeamLoggerLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, token, tokenType, companyId, accountId]);

  if (!token) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-indigo-600/40 blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-sky-500/35 blur-[160px]" />
        </div>
        <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8 rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.7)] backdrop-blur">
            <div className="text-center">
              <p className="mx-auto w-fit rounded-full bg-indigo-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100">
                TeamLogger Sync
              </p>
              <h1 className="mt-4 text-3xl font-semibold text-white">
                Sign in to continue
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Securely connect your TeamLogger account to unlock personalised
                insights.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Username
                </span>
                <input
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginFieldChange}
                  autoComplete="username"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginFieldChange}
                  autoComplete="current-password"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              {loginError && (
                <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-[-25%] h-[26rem] w-[26rem] rounded-full bg-indigo-600/35 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-500/30 blur-[160px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col pb-32">
        <header className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 px-6 pb-28 pt-16 text-white shadow-[0_45px_120px_-50px_rgba(56,189,248,0.65)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),transparent_65%)] opacity-80" />
          <div className="relative z-10 flex flex-col gap-10">
            <div className="rounded-3xl border border-white/15 bg-white/15 p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center justify-start gap-4">
                <p className="text-4xl font-semibold sm:text-5xl">
                  {showSalary ? formattedSalary : "••••••"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSalary((prev) => !prev)}
                    
                  >
                    {showSalary ? (
                      // eye-off / hidden icon
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-5 w-5"
                      >
                        <path
                          d="M3 3l18 18"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.58 10.58A3 3 0 0113.42 13.42"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2.9 12.02C4.65 7.97 8.58 5 12 5c1.66 0 3.22.5 4.6 1.35"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.1 11.98C19.35 16.03 15.42 19 12 19c-1.66 0-3.22-.5-4.6-1.35"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      // eye / visible icon
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-5 w-5"
                      >
                        <path
                          d="M2.5 12S5.5 6 12 6s9.5 6 9.5 6-3 6-9.5 6S2.5 12 2.5 12z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                </button>
              </div>
              {showSalary && enableSalary ? (
                <dl className="mt-4 grid w-full gap-2 text-xs text-white/80 sm:text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="uppercase tracking-[0.25em] text-white/70">
                      {basePayLabel}
                    </dt>
                    <dd className="font-semibold text-white">
                      {formattedBasePay}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="uppercase tracking-[0.25em] text-white/70">
                      Bonus subtotal
                    </dt>
                    <dd className="font-semibold text-white">
                      {formattedBonusSubtotalFull}
                    </dd>
                  </div>
                  <div className="grid gap-1 text-white/70 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>Attendance 5%</span>
                      <span
                        className={
                          attendanceBonusActive
                            ? "font-medium text-emerald-100"
                            : "font-medium text-white/40"
                        }
                      >
                        {formattedAttendanceBonusFull}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Time management 5%</span>
                      <span
                        className={
                          timeManagementBonusActive
                            ? "font-medium text-emerald-100"
                            : "font-medium text-white/40"
                        }
                      >
                        {formattedTimeManagementBonusFull}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Client 3%</span>
                      <span
                        className={
                          clientBonusActive
                            ? "font-medium text-emerald-100"
                            : "font-medium text-white/40"
                        }
                      >
                        {formattedClientBonusFull}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Performance 3%</span>
                      <span
                        className={
                          performanceBonusActive
                            ? "font-medium text-emerald-100"
                            : "font-medium text-white/40"
                        }
                      >
                        {formattedPerformanceBonusFull}
                      </span>
                    </div>
                  </div>
                </dl>
              ) : null}
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  Last sync · {lastSyncLabel}
                </span>
              </div>
              </div>
            </div>
          </div>
        </header>

        <main className="-mt-16 flex-1 space-y-12 px-6 pt-0">
          <section
            className={`${
              activeSection === "overview" ? "block" : "hidden md:block"
            } space-y-8`}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div className={"rounded-3xl bg-slate-900/80 p-6 shadow-[0_24px_80px_-40px_rgba(99,102,241,0.7)] ring-1 ring-white/10 backdrop-blur sm:p-8"}>
                <p className={`text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 ${ hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"}`}>
                  {hoursStatusLabel}
                </p>
                <p className={`mt-4 text-3xl font-semibold sm:text-4xl ${ hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"}`}>
                  <span
                    className={
                      hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"
                    }
                    aria-hidden
                  >
                    {hourDelta >= 0 ? "+" : "-"}
                  </span>
                  {formatNumber(hoursStatusValue)}{" "}
                  <span className={`text-lg text-slate-400 ${ hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"}`}>hours</span>
                </p>
                <p className={`mt-3 text-sm text-slate-300 ${ hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"}`}>
                  You are {hourDelta >= 0 ? "ahead of" : "behind"} the expected
                  pace of {formattedExpectedHours} hours.
                </p>
              </div>

              <div className="rounded-3xl bg-slate-900/80 p-6 shadow-[0_24px_80px_-40px_rgba(14,165,233,0.65)] ring-1 ring-white/10 backdrop-blur sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Logged vs target
                </p>
                <p className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                  {formattedLoggedHours}{" "}
                  <span className="text-lg text-slate-400">hours</span>
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Monthly target: {formatNumber(totalTargetHours)} h
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Expected by today: {formattedExpectedHours} h
                </p>
              </div>

              <div className="rounded-3xl bg-slate-900/80 p-6 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.6)] ring-1 ring-white/10 backdrop-blur sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Rhythm outlook
                </p>
                <p className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                  {formatNumber(workingDaysRemaining)}{" "}
                  <span className="text-lg text-slate-400">days left</span>
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Remaining hours to target:{" "}
                  {formatNumber(Math.max(hoursToTarget, 0))} h
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Total working days this month:{" "}
                  {formatNumber(totalWorkingDays)}
                </p>
              </div>
            </div>
          </section>

          <section
            className={`${
              activeSection === "settings" ? "block" : "hidden md:block"
            } space-y-8`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="space-y-6 rounded-3xl bg-slate-900/70 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Calendar configuration
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Tailor how your working month is calculated by selecting
                    weekends, daily targets, and holidays.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Weekend days
                    </h3>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:flex md:flex-wrap">
                      {WEEKDAY_LABELS.map((label, index) => (
                        <TogglePill
                          key={label}
                          label={label}
                          active={weekendDays.includes(index)}
                          onClick={() => handleToggleWeekend(index)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-300">
                        Target hours per working day
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={dailyTargetHours}
                        onChange={(event) =>
                          setDailyTargetHours(Number(event.target.value) || 0)
                        }
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-300">
                        Add holiday
                      </span>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="date"
                          value={holidayInput}
                          onChange={(event) =>
                            setHolidayInput(event.target.value)
                          }
                          className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                        />
                        <button
                          type="button"
                          onClick={handleAddHoliday}
                          className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                        >
                          Add
                        </button>
                      </div>
                    </label>
                  </div>

                  {holidays.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {holidays.map((date) => (
                        <HolidayBadge
                          key={date}
                          date={date}
                          onRemove={handleRemoveHoliday}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No holidays added yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-900/70 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                  <h3 className="text-lg font-semibold text-white">
                    Earnings preferences
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Configure your hourly rate and currency to unlock salary
                    projections on the home view.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr,1.4fr,1fr]">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-300">
                        Monthly base salary
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={baseSalary}
                        onChange={(event) => setBaseSalary(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-300">
                        Hourly rate (optional)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={hourlyRate}
                        onChange={(event) => setHourlyRate(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-300">
                        Currency
                      </span>
                      <input
                        type="text"
                        maxLength={3}
                        value={salaryCurrency}
                        onChange={(event) =>
                          setSalaryCurrency(event.target.value.toUpperCase())
                        }
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                      />
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    {expectedMonthlyBase > 0
                      ? `Monthly base target: ${formattedBaseSalary}.`
                      : "Set a monthly base salary or hourly rate to establish your target compensation."}
                  </p>
                  <fieldset className="mt-6 space-y-3">
                    <legend className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Compensation controls
                    </legend>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-400/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={enableSalary}
                        onChange={(event) => setEnableSalary(event.target.checked)}
                      />
                      <span className="flex-1">Enable salary calculations</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-400/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={enableAttendanceBonus}
                        disabled={!enableSalary}
                        onChange={(event) =>
                          setEnableAttendanceBonus(event.target.checked)
                        }
                      />
                      <span className="flex-1">Enable attendance bonus (5%)</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-400/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={enableTimeManagementBonus}
                        disabled={!enableSalary}
                        onChange={(event) =>
                          setEnableTimeManagementBonus(event.target.checked)
                        }
                      />
                      <span className="flex-1">Enable time management bonus (5%)</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-400/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={enableClientBonus}
                        disabled={!enableSalary}
                        onChange={(event) =>
                          setEnableClientBonus(event.target.checked)
                        }
                      />
                      <span className="flex-1">Enable client bonus (3%)</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-400/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={enablePerformanceBonus}
                        disabled={!enableSalary}
                        onChange={(event) =>
                          setEnablePerformanceBonus(event.target.checked)
                        }
                      />
                      <span className="flex-1">
                        Enable performance bonus (3%)
                      </span>
                    </label>
                    <p className="text-xs text-slate-500">
                      Bonuses activate automatically when the logged hours match
                      the monthly target and the relevant toggles are enabled.
                    </p>
                  </fieldset>
                  <p className="mt-4 text-xs text-slate-400">
                    {enableSalary
                      ? `Projected compensation this month: ${formattedSalary}.`
                      : "Enable salary calculations to view compensation estimates."}
                  </p>
                </div>

                <div className="space-y-4 rounded-3xl bg-slate-900/70 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Real-time effort tracking
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      We automatically sync your on-computer hours. Adjust below
                      to model different outcomes.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-300">
                      On-computer hours this month
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={loggedHours}
                      onChange={(event) => setLoggedHours(event.target.value)}
                      placeholder="Synced automatically from TeamLogger"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-950/70 p-5 ring-1 ring-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      {hoursStatusLabel}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      <span
                        className={
                          hourDelta >= 0 ? "text-emerald-300 mr-2" : "text-rose-300 mr-2"
                        }
                        aria-hidden
                      >
                        {hourDelta >= 0 ? "+" : "-"}
                      </span>
                      {formatNumber(hoursStatusValue)}{" "}
                      <span className="text-lg text-slate-400">hours</span>
                    </p>
                    <p className="mt-3 text-sm text-slate-300">
                      You are {hourDelta >= 0 ? "ahead of" : "behind"} the
                      expected schedule of {formattedExpectedHours} hours.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-500/10 px-5 py-4 text-sm text-indigo-100">
                    Keep your working rhythm consistent to stay aligned with
                    targets and salary goals.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`${
              activeSection === "insights" ? "block" : "hidden md:block"
            } space-y-8`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="space-y-6 rounded-3xl bg-slate-900/70 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    TeamLogger sync
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Your working hours refresh automatically using the connected
                    TeamLogger account.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-950/70 p-6 ring-1 ring-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Connected account
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {accountName || "—"}
                    </p>
                    <dl className="mt-4 space-y-3 text-sm text-slate-200">
                      <div className="flex flex-wrap justify-between gap-3 text-slate-300">
                        <dt>Email</dt>
                        <dd className="font-medium text-white">
                          {auth.account?.email ?? "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-3 text-slate-300">
                        <dt>Company</dt>
                        <dd className="font-medium text-white">
                          {companyName || "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-3 text-slate-300">
                        <dt>Username</dt>
                        <dd className="font-medium text-white">
                          {auth.account?.username ?? "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-3 text-slate-300">
                        <dt>Last synced</dt>
                        <dd className="font-medium text-white">
                          {lastSyncLabel}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {teamLoggerError && (
                    <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {teamLoggerError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-400/60 hover:text-red-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl bg-slate-900/70 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Total time worked
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Results are parsed automatically from matching{" "}
                    <code>totalWorked*</code> or tracked duration fields.
                  </p>
                </div>

                {teamLoggerTotals ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-slate-950/70 p-6 ring-1 ring-white/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                        Tracked duration
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {formatDuration(
                          teamLoggerTotals.totalWorkedMilliseconds
                        )}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        ≈ {formatNumber(teamLoggerTotals.totalWorkedHours)}{" "}
                        hours in total.
                      </p>
                      {teamLoggerStats?.title || teamLoggerStats?.email ? (
                        <p className="mt-3 text-xs text-slate-400">
                          {[teamLoggerStats?.title, teamLoggerStats?.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    {teamLoggerStats ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <StatTile
                            label="On computer hours"
                            value={formatHoursValue(
                              teamLoggerStats.onComputerHours
                            )}
                            accent="text-indigo-200"
                          />
                          <StatTile
                            label="Break hours"
                            value={formatHoursValue(teamLoggerStats.breakHours)}
                            accent="text-rose-200"
                          />
                          <StatTile
                            label="Meeting hours"
                            value={formatHoursValue(
                              teamLoggerStats.meetingHours
                            )}
                            accent="text-sky-200"
                          />
                          <StatTile
                            label="Idle hours"
                            value={formatHoursValue(teamLoggerStats.idleHours)}
                            accent="text-amber-200"
                          />
                          <StatTile
                            label="Span hours"
                            value={formatHoursValue(teamLoggerStats.spanHours)}
                            accent="text-emerald-200"
                          />
                          <StatTile
                            label="Active minutes ratio"
                            value={formatPercentageValue(
                              teamLoggerStats.activeMinutesRatio
                            )}
                            accent="text-indigo-200"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <StatTile
                            label="Active seconds ratio"
                            value={formatPercentageValue(
                              teamLoggerStats.activeSecondsRatio
                            )}
                            accent="text-purple-200"
                          />
                          <StatTile
                            label="Active time"
                            value={formatSecondsValue(
                              teamLoggerStats.activeSecondsCount
                            )}
                            accent="text-emerald-200"
                          />
                          <StatTile
                            label="Inactive time"
                            value={formatSecondsValue(
                              teamLoggerStats.inactiveSecondsCount
                            )}
                            accent="text-rose-200"
                          />
                        </div>

                        {teamLoggerStats.las ? (
                          <div className="rounded-3xl bg-slate-950/70 p-6 ring-1 ring-white/5">
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                              Latest activity snapshot
                            </p>
                            <dl className="mt-4 space-y-3 text-sm text-slate-200">
                              <div className="flex justify-between gap-3 text-slate-300">
                                <dt>Timer status</dt>
                                <dd className="font-medium text-white">
                                  {teamLoggerStats.las.tStatus ?? "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <dt>User status</dt>
                                <dd className="font-medium text-white">
                                  {teamLoggerStats.las.uStatus ?? "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <dt>Idle time</dt>
                                <dd className="font-medium text-white">
                                  {formatSecondsValue(
                                    teamLoggerStats.las.idleSecs
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <dt>App version</dt>
                                <dd className="font-medium text-white">
                                  {teamLoggerStats.las.cVersion ?? "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <dt>Last sync</dt>
                                <dd className="font-medium text-white">
                                  {formatTimestamp(teamLoggerStats.las.ts)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <details className="rounded-2xl bg-slate-950/60 p-4 text-sm text-slate-200 ring-1 ring-white/5">
                      <summary className="cursor-pointer font-medium text-white">
                        View raw response
                      </summary>
                      <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-slate-950/80 p-4 text-xs text-slate-300">
                        {JSON.stringify(teamLoggerTotals.raw, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-950/60 p-6 text-sm text-slate-300 ring-1 ring-white/5">
                    {teamLoggerLoading
                      ? "Syncing your TeamLogger report…"
                      : "Your TeamLogger working hours will appear here after the automatic sync completes."}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>



        <nav className="fixed bottom-6 left-1/2 z-30 w-[min(420px,calc(100%-32px))] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-3xl bg-slate-900/90 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  activeSection === tab.key
                    ? "bg-slate-800/80 text-sky-200 shadow-[0_18px_40px_-25px_rgba(56,189,248,0.9)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <tab.icon
                  className={`h-5 w-5 ${
                    activeSection === tab.key
                      ? "text-sky-200"
                      : "text-slate-500"
                  }`}
                />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default App;
