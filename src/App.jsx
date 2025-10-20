import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import {
  authenticateTeamLogger,
  fetchTeamLoggerTotalTime,
  formatDuration,
} from './services/teamLogger';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SECTION_TABS = [
  { key: 'overview', label: 'Overview', helper: 'View at a glance' },
  { key: 'settings', label: 'Settings', helper: 'Tune your calendar' },
  { key: 'insights', label: 'Insights', helper: 'Deep dive data' },
];

const StatTile = ({ label, value, accent }) => (
  <div className="rounded-2xl bg-slate-900/70 p-6 shadow-elevated ring-1 ring-slate-800">
    <p className="text-sm font-medium text-slate-400">{label}</p>
    <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
  </div>
);

const TogglePill = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200
      ${
        active
          ? 'border-primary-500 bg-primary-600/20 text-primary-200 shadow-elevated'
          : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-primary-500/50 hover:text-primary-200'
      }`}
  >
    {label}
  </button>
);

const HolidayBadge = ({ date, onRemove }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-sm text-slate-200">
    {dayjs(date).format('DD MMM')}
    <button
      type="button"
      onClick={() => onRemove(date)}
      className="rounded-full bg-slate-800/80 p-1 text-xs text-slate-400 transition hover:bg-red-500/20 hover:text-red-300"
      aria-label={`Remove ${date}`}
    >
      ✕
    </button>
  </span>
);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);

const TEAMLOGGER_DEFAULT_FILTERS = {
  startTime: 1759258800000,
  endTime: 1761937199000,
  dayStartCutOff: 0,
  dayEndCutOff: -1,
  suppressDetails: false,
};

const TEAMLOGGER_STORAGE_KEY = 'teamLoggerAuth';

function useWorkingCalendar({ weekendDays, holidays, dailyTargetHours }) {
  return useMemo(() => {
    const today = dayjs();
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');

    let workingDaysThisMonth = 0;
    let workingDaysUntilToday = 0;

    for (let date = startOfMonth; date.isBefore(endOfMonth) || date.isSame(endOfMonth, 'day'); date = date.add(1, 'day')) {
      const isWeekend = weekendDays.includes(date.day());
      const isHoliday = holidays.includes(date.format('YYYY-MM-DD'));
      if (isWeekend || isHoliday) continue;

      workingDaysThisMonth += 1;
      if (date.isBefore(today, 'day') || date.isSame(today, 'day')) {
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
  const [holidayInput, setHolidayInput] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [loggedHours, setLoggedHours] = useState('');
  const [auth, setAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(TEAMLOGGER_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.accessToken) {
            return {
              accessToken: parsed.accessToken,
              tokenType: parsed.tokenType ?? 'Bearer',
              account: parsed.account ?? null,
            };
          }
        } catch {
          window.localStorage.removeItem(TEAMLOGGER_STORAGE_KEY);
        }
      }
    }

    return { accessToken: '', tokenType: 'Bearer', account: null };
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [teamLoggerLoading, setTeamLoggerLoading] = useState(false);
  const [teamLoggerError, setTeamLoggerError] = useState('');
  const [teamLoggerTotals, setTeamLoggerTotals] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const { totalWorkingDays, workingDaysToDate, totalTargetHours, expectedHoursByToday } = useWorkingCalendar({
    weekendDays,
    holidays,
    dailyTargetHours,
  });

  const accountId = auth.account?.id ?? '';
  const companyId = auth.account?.companyId ?? '';
  const accountName = auth.account?.name || auth.account?.username || '';
  const companyName = auth.account?.company?.name || '';
  const token = auth.accessToken;
  const tokenType = auth.tokenType ?? 'Bearer';
  const isAuthenticated = Boolean(token && accountId && companyId);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (auth.accessToken) {
      window.localStorage.setItem(TEAMLOGGER_STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(TEAMLOGGER_STORAGE_KEY);
    }
  }, [auth]);

  const parsedLoggedHours = parseFloat(loggedHours) || 0;
  const hourDelta = parsedLoggedHours - expectedHoursByToday;
  const hoursStatusLabel = hourDelta >= 0 ? 'Advanced hours' : 'Remaining hours';
  const hoursStatusValue = Math.abs(hourDelta);
  const formattedLoggedHours = formatNumber(parsedLoggedHours);
  const formattedExpectedHours = formatNumber(expectedHoursByToday);

  const teamLoggerStats = teamLoggerTotals?.stats;
  const formatHoursValue = (hours) =>
    Number.isFinite(hours) ? `${formatNumber(hours)} h` : '—';
  const formatPercentageValue = (ratio) =>
    Number.isFinite(ratio) ? `${formatNumber(ratio * 100)}%` : '—';
  const formatSecondsValue = (seconds) =>
    Number.isFinite(seconds) ? formatDuration(seconds * 1000) : '—';
  const formatTimestamp = (value) =>
    Number.isFinite(value) && value > 0 ? dayjs(value).format('DD MMM YYYY HH:mm') : '—';

  const handleToggleWeekend = (dayIndex) => {
    setWeekendDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((day) => day !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleAddHoliday = () => {
    if (!holidayInput) return;
    const formatted = dayjs(holidayInput).format('YYYY-MM-DD');
    if (!formatted || formatted === 'Invalid Date') return;
    setHolidays((prev) => (prev.includes(formatted) ? prev : [...prev, formatted].sort()));
    setHolidayInput('');
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
      setLoginError('Username and password are required.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      const payload = await authenticateTeamLogger({ username, password });
      setAuth({
        accessToken: payload.accessToken,
        tokenType: payload.tokenType ?? 'Bearer',
        account: payload.account ?? null,
      });
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = () => {
    setAuth({ accessToken: '', tokenType: 'Bearer', account: null });
    setTeamLoggerTotals(null);
    setTeamLoggerError('');
    setTeamLoggerLoading(false);
    setLoggedHours('');
    setLastSyncedAt(null);
    setLoginForm({ username: '', password: '' });
    setLoginError('');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let ignore = false;

    const fetchReport = async () => {
      setTeamLoggerLoading(true);
      setTeamLoggerError('');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-8 shadow-elevated">
            <div className="text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-200">
                TeamLogger Sync
              </p>
              <h1 className="mt-4 text-3xl font-bold text-white">Sign in to continue</h1>
              <p className="mt-2 text-sm text-slate-400">
                Enter your TeamLogger credentials to securely retrieve your working hours and analytics.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Username</span>
                <input
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginFieldChange}
                  autoComplete="username"
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Password</span>
                <input
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginFieldChange}
                  autoComplete="current-password"
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                />
              </label>

              {loginError && (
                <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/40 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none"
              >
                {loginLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-16 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-600/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-200">
            Productivity Companion
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Work Hours Intelligence Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
            Configure your calendar in seconds and stay on top of your progress. View smart projections for working days,
            targeted hours, and real-time balance on a beautifully modern interface built for any screen size.
          </p>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-y border-slate-800/70 bg-slate-950/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl gap-2 px-4 py-3">
          {SECTION_TABS.map(({ key, label, helper }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`flex-1 rounded-2xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${
                activeSection === key
                  ? 'border-transparent bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'border-slate-800/80 bg-slate-900/70 text-slate-300 hover:border-primary-500/50 hover:text-primary-100'
              }`}
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-1 block text-[11px] font-normal text-slate-400">{helper}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-10 sm:px-6">
        <section className={`${activeSection === 'overview' ? 'block' : 'hidden md:block'} space-y-6 md:space-y-10`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total working days" value={formatNumber(totalWorkingDays)} accent="text-primary-200" />
            <StatTile label="Targeted hours this month" value={`${formatNumber(totalTargetHours)} h`} accent="text-emerald-200" />
            <StatTile label="Working days so far" value={formatNumber(workingDaysToDate)} accent="text-sky-200" />
            <StatTile label="Expected hours to date" value={`${formattedExpectedHours} h`} accent="text-rose-200" />
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-elevated md:p-8">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Progress snapshot</h2>
              <p className="text-sm text-slate-400">
                Track your monthly goals at a glance. These insights refresh instantly as your TeamLogger data updates.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm uppercase tracking-wide text-slate-400">{hoursStatusLabel}</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {formatNumber(hoursStatusValue)} <span className="text-lg text-slate-400">hours</span>
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  You are {hourDelta >= 0 ? 'ahead of' : 'behind'} the expected schedule of {formattedExpectedHours} hours.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm uppercase tracking-wide text-slate-400">Logged vs. target</p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {formattedLoggedHours} <span className="text-lg text-slate-400">hours</span>
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  Target this month: {formatNumber(totalTargetHours)} h
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Expected by today: {formattedExpectedHours} h
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Last sync · {teamLoggerLoading ? 'Syncing…' : lastSyncedAt ? dayjs(lastSyncedAt).format('DD MMM YYYY HH:mm') : 'Awaiting sync'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${activeSection === 'settings' ? 'block' : 'hidden md:block'} space-y-6 md:space-y-10`}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-elevated md:p-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Calendar configuration</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select your weekend days, preferred daily target, and mark upcoming holidays to personalise the projections above.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Weekend days</h3>
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-400">Target hours per working day</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={dailyTargetHours}
                      onChange={(event) => setDailyTargetHours(Number(event.target.value) || 0)}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-400">Add holiday</span>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="date"
                        value={holidayInput}
                        onChange={(event) => setHolidayInput(event.target.value)}
                        className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                      />
                      <button
                        type="button"
                        onClick={handleAddHoliday}
                        className="rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500"
                      >
                        Add
                      </button>
                    </div>
                  </label>
                </div>

                {holidays.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {holidays.map((date) => (
                      <HolidayBadge key={date} date={date} onRemove={handleRemoveHoliday} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No holidays added yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-elevated md:p-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Real-time effort tracking</h2>
                <p className="mt-1 text-sm text-slate-400">
                  We automatically sync your on-computer hours from TeamLogger. Adjust the value below to explore what-if scenarios.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-400">On-computer hours this month</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={loggedHours}
                    onChange={(event) => setLoggedHours(event.target.value)}
                    placeholder="Synced automatically from TeamLogger"
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-lg text-white outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                  <p className="text-sm uppercase tracking-wide text-slate-400">{hoursStatusLabel}</p>
                  <p className="mt-3 text-4xl font-semibold text-white">
                    {formatNumber(hoursStatusValue)} <span className="text-lg text-slate-400">hours</span>
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    You are {hourDelta >= 0 ? 'ahead of' : 'behind'} the expected schedule of {formattedExpectedHours} hours.
                  </p>
                </div>

                <div className="rounded-2xl bg-primary-600/10 p-6 text-sm text-primary-100">
                  <p className="font-medium text-primary-200">Productivity note</p>
                  <p className="mt-1 text-primary-100/80">
                    Consider batching focus work on longer working streaks and keep holidays updated to maintain accurate projections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${activeSection === 'insights' ? 'block' : 'hidden md:block'} space-y-6 md:space-y-10`}>
          <div className="space-y-6 md:grid md:grid-cols-[1.2fr,1fr] md:items-start md:gap-6">
            <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-elevated md:p-8">
              <div>
                <h2 className="text-xl font-semibold text-white">TeamLogger sync</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your working hours refresh automatically using the connected TeamLogger account.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                  <p className="text-sm uppercase tracking-wide text-slate-400">Connected account</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{accountName || '—'}</p>
                  <dl className="mt-4 space-y-2 text-sm text-slate-300">
                    <div className="flex flex-wrap justify-between gap-3">
                      <dt className="text-slate-400">Email</dt>
                      <dd className="font-medium text-slate-200">{auth.account?.email ?? '—'}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-3">
                      <dt className="text-slate-400">Company</dt>
                      <dd className="font-medium text-slate-200">{companyName || '—'}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-3">
                      <dt className="text-slate-400">Username</dt>
                      <dd className="font-medium text-slate-200">{auth.account?.username ?? '—'}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-3">
                      <dt className="text-slate-400">Last synced</dt>
                      <dd className="font-medium text-slate-200">
                        {teamLoggerLoading
                          ? 'Syncing…'
                          : lastSyncedAt
                            ? dayjs(lastSyncedAt).format('DD MMM YYYY HH:mm')
                            : 'Awaiting sync'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {teamLoggerError && (
                  <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {teamLoggerError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-400/60 hover:text-red-200"
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-elevated md:p-8">
              <div>
                <h3 className="text-lg font-semibold text-white">Total time worked</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Results are parsed automatically from any matching <code>totalWorked*</code> or tracked duration fields in the API response.
                </p>
              </div>

              {teamLoggerTotals ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <p className="text-sm uppercase tracking-wide text-slate-400">Tracked duration</p>
                    <p className="mt-3 text-4xl font-semibold text-white">
                      {formatDuration(teamLoggerTotals.totalWorkedMilliseconds)}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      ≈ {formatNumber(teamLoggerTotals.totalWorkedHours)} hours in total.
                    </p>
                    {teamLoggerStats?.title || teamLoggerStats?.email ? (
                      <p className="mt-3 text-xs text-slate-500">
                        {[teamLoggerStats?.title, teamLoggerStats?.email].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  {teamLoggerStats ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatTile
                          label="On computer hours"
                          value={formatHoursValue(teamLoggerStats.onComputerHours)}
                          accent="text-primary-200"
                        />
                        <StatTile
                          label="Break hours"
                          value={formatHoursValue(teamLoggerStats.breakHours)}
                          accent="text-rose-200"
                        />
                        <StatTile
                          label="Meeting hours"
                          value={formatHoursValue(teamLoggerStats.meetingHours)}
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
                          value={formatPercentageValue(teamLoggerStats.activeMinutesRatio)}
                          accent="text-indigo-200"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatTile
                          label="Active seconds ratio"
                          value={formatPercentageValue(teamLoggerStats.activeSecondsRatio)}
                          accent="text-purple-200"
                        />
                        <StatTile
                          label="Active time"
                          value={formatSecondsValue(teamLoggerStats.activeSecondsCount)}
                          accent="text-emerald-200"
                        />
                        <StatTile
                          label="Inactive time"
                          value={formatSecondsValue(teamLoggerStats.inactiveSecondsCount)}
                          accent="text-rose-200"
                        />
                      </div>

                      {teamLoggerStats.las ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                          <p className="text-sm uppercase tracking-wide text-slate-400">Latest activity snapshot</p>
                          <dl className="mt-4 space-y-2 text-sm text-slate-300">
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-400">Timer status</dt>
                              <dd className="font-medium text-slate-200">{teamLoggerStats.las.tStatus ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-400">User status</dt>
                              <dd className="font-medium text-slate-200">{teamLoggerStats.las.uStatus ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-400">Idle time</dt>
                              <dd className="font-medium text-slate-200">{formatSecondsValue(teamLoggerStats.las.idleSecs)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-400">App version</dt>
                              <dd className="font-medium text-slate-200">{teamLoggerStats.las.cVersion ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-400">Last sync</dt>
                              <dd className="font-medium text-slate-200">{formatTimestamp(teamLoggerStats.las.ts)}</dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <details className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
                    <summary className="cursor-pointer font-medium text-slate-200">View raw response</summary>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-slate-300">
                      {JSON.stringify(teamLoggerTotals.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
                  {teamLoggerLoading
                    ? 'Syncing your TeamLogger report…'
                    : 'Your TeamLogger working hours will appear here after the automatic sync completes.'}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
          Crafted with Tailwind CSS & React · Stay balanced and inspired ✨
        </div>
      </footer>
    </div>
  );
}

export default App;
