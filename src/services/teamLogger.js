const DEFAULT_BASE_URL = 'https://api2.teamlogger.com/api';

export async function authenticateTeamLogger({
  username,
  password,
  grantType = 'password',
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  if (!username || !password) {
    throw new Error('Both username and password are required.');
  }

  const response = await fetch(`${baseUrl}/Token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
      grantType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Authentication failed with ${response.status} ${response.statusText}. ${body}`);
  }

  const payload = await response.json();

  if (!payload?.accessToken) {
    throw new Error('Authentication response did not include an access token.');
  }

  return payload;
}

const DURATION_KEY_PATTERNS = [
  { regex: /total.*(work|track).*(millisecond|ms)/i, unit: 'ms' },
  { regex: /total.*(work|track).*(second|sec)/i, unit: 's' },
  { regex: /total.*(work|track).*(minute|min)/i, unit: 'm' },
  { regex: /total.*(work|track).*(hour|hr)/i, unit: 'h' },
  { regex: /(worked|tracked).*milliseconds?/i, unit: 'ms' },
  { regex: /(worked|tracked).*seconds?/i, unit: 's' },
  { regex: /(worked|tracked).*minutes?/i, unit: 'm' },
  { regex: /(worked|tracked).*hours?/i, unit: 'h' },
];

const DURATION_STRING_PATTERNS = [
  /^(\d{1,2}):(\d{2}):(\d{2})$/, // hh:mm:ss
  /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i, // ISO8601 duration like PT1H30M
];

const toMilliseconds = (value, unit) => {
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return 0;
  }
};

const parseDurationString = (value) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  const matchHms = trimmed.match(DURATION_STRING_PATTERNS[0]);
  if (matchHms) {
    const [, hours, minutes, seconds] = matchHms.map(Number);
    return toMilliseconds(hours ?? 0, 'h') + toMilliseconds(minutes ?? 0, 'm') + toMilliseconds(seconds ?? 0, 's');
  }

  const matchIso = trimmed.match(DURATION_STRING_PATTERNS[1]);
  if (matchIso) {
    const [, hours = '0', minutes = '0', seconds = '0'] = matchIso;
    return (
      toMilliseconds(Number(hours), 'h') +
      toMilliseconds(Number(minutes), 'm') +
      toMilliseconds(Number(seconds), 's')
    );
  }

  return null;
};

const findBestDurationCandidate = (value, currentBest = 0, path = []) => {
  if (value == null) {
    return currentBest;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const currentKey = path[path.length - 1] || '';
    for (const pattern of DURATION_KEY_PATTERNS) {
      if (pattern.regex.test(currentKey)) {
        const candidate = toMilliseconds(value, pattern.unit);
        return Math.max(candidate, currentBest);
      }
    }
  }

  if (typeof value === 'string') {
    const currentKey = path[path.length - 1] || '';
    for (const pattern of DURATION_KEY_PATTERNS) {
      if (pattern.regex.test(currentKey)) {
        const candidate = parseFloat(value);
        if (!Number.isNaN(candidate)) {
          return Math.max(toMilliseconds(candidate, pattern.unit), currentBest);
        }
      }
    }

    const stringDuration = parseDurationString(value);
    if (typeof stringDuration === 'number') {
      return Math.max(stringDuration, currentBest);
    }
  }

  if (Array.isArray(value)) {
    return value.reduce(
      (best, item) => findBestDurationCandidate(item, best, path),
      currentBest,
    );
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce(
      (best, [key, nestedValue]) => findBestDurationCandidate(nestedValue, best, [...path, key]),
      currentBest,
    );
  }

  return currentBest;
};

const normaliseSuppressionFlag = (flag) => {
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'string') {
    const value = flag.trim().toLowerCase();
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return false;
};

const toMillisecondsFromHours = (hours) => {
  if (!Number.isFinite(hours)) return null;
  return hours * 60 * 60 * 1000;
};

const toMillisecondsFromSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  return seconds * 1000;
};

const extractEmployeeReportStats = (payload) => {
  const report = payload?.employeeTimeReport;
  if (!report || !Array.isArray(report.timeReportItems) || report.timeReportItems.length === 0) {
    return { report: report ?? null, item: null, stats: null };
  }

  const item = report.timeReportItems.find((entry) => entry && typeof entry === 'object') ?? null;
  if (!item) {
    return { report, item: null, stats: null };
  }

  const {
    title,
    email,
    totalHours,
    activeMinutesRatio,
    activeSecondsRatio,
    totalSecondsCount,
    activeSecondsCount,
    inactiveSecondsCount,
    breakHours,
    spanHours,
    onComputerHours,
    meetingHours,
    idleHours,
    las,
  } = item;

  const sanitiseNumber = (value) => (Number.isFinite(value) ? value : null);

  return {
    report,
    item,
    stats: {
      title: title ?? null,
      email: email ?? null,
      totalHours: sanitiseNumber(totalHours),
      activeMinutesRatio: sanitiseNumber(activeMinutesRatio),
      activeSecondsRatio: sanitiseNumber(activeSecondsRatio),
      totalSecondsCount: sanitiseNumber(totalSecondsCount),
      activeSecondsCount: sanitiseNumber(activeSecondsCount),
      inactiveSecondsCount: sanitiseNumber(inactiveSecondsCount),
      breakHours: sanitiseNumber(breakHours),
      spanHours: sanitiseNumber(spanHours),
      onComputerHours: sanitiseNumber(onComputerHours),
      meetingHours: sanitiseNumber(meetingHours),
      idleHours: sanitiseNumber(idleHours),
      las: las ?? null,
    },
  };
};

export async function fetchTeamLoggerTotalTime({
  token,
  tokenType = 'Bearer',
  companyId,
  accountId,
  startTime,
  endTime,
  dayStartCutOff = 0,
  dayEndCutOff = -1,
  suppressDetails = false,
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  if (!token) {
    throw new Error('A valid TeamLogger API token is required.');
  }

  if (!companyId || !accountId) {
    throw new Error('Both companyId and accountId must be provided.');
  }

  const url = new URL(`${baseUrl}/companies/${companyId}/reports_new2`);
  url.searchParams.set('accountId', accountId);

  if (startTime) url.searchParams.set('startTime', String(startTime));
  if (endTime) url.searchParams.set('endTime', String(endTime));
  if (dayStartCutOff != null) url.searchParams.set('dayStartCutOff', String(dayStartCutOff));
  if (dayEndCutOff != null) url.searchParams.set('dayEndCutOff', String(dayEndCutOff));
  url.searchParams.set('suppressDetails', String(normaliseSuppressionFlag(suppressDetails)));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `${tokenType} ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `TeamLogger request failed with ${response.status} ${response.statusText}. ${body}`,
    );
  }

  const payload = await response.json();

  const { report, item, stats } = extractEmployeeReportStats(payload);
  const candidateDurations = [
    toMillisecondsFromHours(stats?.totalHours ?? null),
    toMillisecondsFromHours(stats?.onComputerHours ?? null),
    toMillisecondsFromHours(stats?.spanHours ?? null),
    toMillisecondsFromSeconds(stats?.totalSecondsCount ?? null),
    toMillisecondsFromSeconds(stats?.activeSecondsCount ?? null),
    findBestDurationCandidate(payload),
  ].filter((value) => typeof value === 'number' && value >= 0);

  const totalWorkedMilliseconds =
    candidateDurations.length > 0 ? Math.max(...candidateDurations) : 0;

  return {
    raw: payload,
    totalWorkedMilliseconds,
    totalWorkedHours: totalWorkedMilliseconds / (60 * 60 * 1000),
    employeeTimeReport: report,
    employeeTimeReportItem: item,
    stats,
  };
}

export const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return '0h 0m';
  }

  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};
