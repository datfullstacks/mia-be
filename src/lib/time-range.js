function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  var day = date.getDay();
  var normalizedDay = day === 0 ? 6 : day - 1;
  var result = startOfDay(date);
  result.setDate(result.getDate() - normalizedDay);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date) {
  var quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

exports.resolveRange = function resolveRange(period) {
  var now = new Date();
  var normalizedPeriod = String(period || 'all').toLowerCase();

  if (normalizedPeriod === 'day') {
    return { period: 'day', start: startOfDay(now), end: now };
  }

  if (normalizedPeriod === 'week') {
    return { period: 'week', start: startOfWeek(now), end: now };
  }

  if (normalizedPeriod === 'month') {
    return { period: 'month', start: startOfMonth(now), end: now };
  }

  if (normalizedPeriod === 'quarter') {
    return { period: 'quarter', start: startOfQuarter(now), end: now };
  }

  if (normalizedPeriod === 'year') {
    return { period: 'year', start: startOfYear(now), end: now };
  }

  return { period: 'all', start: null, end: now };
};

exports.isWithinRange = function isWithinRange(value, range) {
  if (!range || !range.start) {
    return true;
  }

  var timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
};
