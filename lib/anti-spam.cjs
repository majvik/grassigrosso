function findHoneypotValue(body = {}) {
  const keys = ['website', 'url', 'homepage'];
  for (const key of keys) {
    const value = body[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return { key, value: value.trim() };
    }
  }
  return null;
}

function buildRetryAfterSeconds(now, blockedUntil) {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

function createAntiSpamProtector(options = {}) {
  const numberOrDefault = (value, fallback) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return Number(fallback);
    }
    return Number(value);
  };

  const config = {
    windowMs: numberOrDefault(options.windowMs, 10 * 60 * 1000),
    maxSubmitsPerWindow: numberOrDefault(options.maxSubmitsPerWindow, 6),
    minSubmitIntervalMs: numberOrDefault(options.minSubmitIntervalMs, 8000),
    blockMs: numberOrDefault(options.blockMs, 30 * 60 * 1000),
    maxCommentLength: numberOrDefault(options.maxCommentLength, 2500),
    maxNameLength: numberOrDefault(options.maxNameLength, 120),
    maxPhoneLength: numberOrDefault(options.maxPhoneLength, 40),
    maxEmailLength: numberOrDefault(options.maxEmailLength, 160),
  };

  const stateByIp = new Map();

  function getState(ip, now) {
    const existing = stateByIp.get(ip);
    if (existing) {
      existing.lastSeenAt = now;
      if (now - existing.windowStart >= config.windowMs) {
        existing.windowStart = now;
        existing.count = 0;
      }
      return existing;
    }

    const created = {
      windowStart: now,
      count: 0,
      lastSubmitAt: 0,
      blockedUntil: 0,
      lastSeenAt: now
    };
    stateByIp.set(ip, created);
    return created;
  }

  function checkSubmission({ ip = 'unknown', body = {}, lead = {}, now = Date.now() }) {
    const state = getState(ip, now);

    if (state.blockedUntil > now) {
      return {
        ok: false,
        status: 429,
        ip,
        retryAfterSeconds: buildRetryAfterSeconds(now, state.blockedUntil),
        error: 'Слишком много запросов. Повторите позже.'
      };
    }

    const honeypot = findHoneypotValue(body);
    if (honeypot) {
      state.blockedUntil = now + config.blockMs;
      return {
        ok: false,
        status: 429,
        ip,
        retryAfterSeconds: buildRetryAfterSeconds(now, state.blockedUntil),
        error: 'Запрос отклонен системой антиспама.'
      };
    }

    if ((lead.comment || '').length > config.maxCommentLength) {
      return {
        ok: false,
        status: 400,
        ip,
        error: `Слишком длинное сообщение (максимум ${config.maxCommentLength} символов).`
      };
    }

    if (
      (lead.name || '').length > config.maxNameLength ||
      (lead.phone || '').length > config.maxPhoneLength ||
      (lead.email || '').length > config.maxEmailLength
    ) {
      return {
        ok: false,
        status: 400,
        ip,
        error: 'Некорректная длина полей формы.'
      };
    }

    if (state.lastSubmitAt > 0 && now - state.lastSubmitAt < config.minSubmitIntervalMs) {
      state.blockedUntil = now + config.blockMs;
      return {
        ok: false,
        status: 429,
        ip,
        retryAfterSeconds: buildRetryAfterSeconds(now, state.blockedUntil),
        error: 'Слишком частые отправки формы. Повторите позже.'
      };
    }

    state.count += 1;
    state.lastSubmitAt = now;

    if (state.count > config.maxSubmitsPerWindow) {
      state.blockedUntil = now + config.blockMs;
      return {
        ok: false,
        status: 429,
        ip,
        retryAfterSeconds: buildRetryAfterSeconds(now, state.blockedUntil),
        error: 'Превышен лимит отправок формы. Повторите позже.'
      };
    }

    return { ok: true, ip };
  }

  function cleanupState(now = Date.now()) {
    const ttl = Math.max(config.windowMs, config.blockMs) * 2;
    for (const [ip, state] of stateByIp.entries()) {
      if ((state.blockedUntil || 0) > now) continue;
      if ((state.lastSeenAt || 0) + ttl > now) continue;
      stateByIp.delete(ip);
    }
  }

  return {
    checkSubmission,
    cleanupState,
    config
  };
}

module.exports = {
  createAntiSpamProtector,
  findHoneypotValue
};
