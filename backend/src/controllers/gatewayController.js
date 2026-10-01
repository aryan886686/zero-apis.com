const fetch = require('node-fetch');
const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');
const RequestLog = require('../models/RequestLog');
const Cache = require('../models/Cache');
const logger = require('../utils/logger');

/**
 * Main API Gateway Handler
 * Processes incoming API requests, validates keys, and proxies to upstream
 * 
 * GET /api/v1/:endpoint
 */
const handleRequest = async (req, res) => {
  const startTime = Date.now();
  const { endpoint } = req.params;
  const apiKeyStr = req.query.key || req.headers['x-api-key'];

  let logData = {
    endpoint,
    method: req.method,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
    statusCode: 500,
    responseTime: 0,
    requestSize: parseInt(req.headers['content-length'] || '0'),
    responseSize: 0,
  };

  try {
    // 1. Validate API key exists
    if (!apiKeyStr) {
      logData.statusCode = 401;
      logData.error = 'API key required';
      saveLog(logData); // Async background
      return res.status(401).json({
        success: false,
        error: 'API key is required. Pass via ?key=YOUR_KEY or X-API-Key header.',
      });
    }

    // 2. Find API key
    const apiKey = await ApiKey.findOne({ key: apiKeyStr });
    if (!apiKey) {
      logData.statusCode = 401;
      logData.error = 'Invalid API key';
      saveLog(logData); // Async background
      return res.status(401).json({
        success: false,
        error: 'Invalid API key.',
      });
    }

    logData.keyId = apiKey._id;

    // 3. Check key status
    if (apiKey.status !== 'active') {
      logData.statusCode = 403;
      logData.error = `API key is ${apiKey.status}`;
      saveLog(logData);
      return res.status(403).json({
        success: false,
        error: `API key is ${apiKey.status}.`,
      });
    }

    // 4. Check key expiry
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      apiKey.status = 'expired';
      apiKey.save().catch(err => logger.error('Async API key expiry save failed: ' + err.message));
      logData.statusCode = 403;
      logData.error = 'API key expired';
      saveLog(logData);
      return res.status(403).json({
        success: false,
        error: 'API key has expired.',
      });
    }

    // 5. Find API endpoint
    let api = await Api.findOne({ customEndpoint: endpoint });
    if (!api && endpoint.endsWith('.php')) {
      api = await Api.findOne({ customEndpoint: endpoint.replace('.php', '') });
    }
    if (!api) {
      logData.statusCode = 404;
      logData.error = 'Endpoint not found';
      saveLog(logData);
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found.',
      });
    }

    logData.apiId = api._id;

    // 6. Check API status
    if (api.status !== 'active') {
      logData.statusCode = 503;
      logData.error = `API is ${api.status}`;
      saveLog(logData);
      return res.status(503).json({
        success: false,
        error: `This API is currently ${api.status}.`,
      });
    }

    // 7. Check endpoint permissions
    if (!apiKey.allowedApis.includes('*') && !apiKey.allowedApis.includes(api.customEndpoint)) {
      logData.statusCode = 403;
      logData.error = 'Endpoint not allowed for this key';
      saveLog(logData);
      return res.status(403).json({
        success: false,
        error: 'Your API key does not have access to this endpoint.',
      });
    }

    // 8. Attach docs for rate limiter middleware
    req.apiKeyDoc = apiKey;
    req.apiDoc = api;

    // 9. Build upstream URL — Universal parameter forwarding
    // Collect ALL user query params except 'key'
    const userParams = {};
    Object.entries(req.query).forEach(([k, v]) => {
      if (k !== 'key') userParams[k] = v;
    });

    // Also check body for the primary param
    if (!userParams[api.paramName] && req.body && req.body[api.paramName]) {
      userParams[api.paramName] = req.body[api.paramName];
    }

    // Validate required parameter
    if (api.paramName && !userParams[api.paramName]) {
      logData.statusCode = 400;
      logData.error = `Missing required parameter: ${api.paramName}`;
      saveLog(logData);
      return res.status(400).json({
        success: false,
        error: `Missing required parameter: ${api.paramName}`,
      });
    }

    let finalUpstreamStr = api.upstreamUrl;

    // Step A: Replace ALL {placeholder} tokens in the URL
    const usedParams = new Set();
    for (const [key, value] of Object.entries(userParams)) {
      if (finalUpstreamStr.includes(`{${key}}`)) {
        finalUpstreamStr = finalUpstreamStr.replaceAll(`{${key}}`, encodeURIComponent(value));
        usedParams.add(key);
      }
    }

    const upstreamUrl = new URL(finalUpstreamStr);

    // Step B: Fill any empty query params in the upstream URL with the primary param value
    const primaryValue = userParams[api.paramName];
    for (const [urlKey, urlVal] of [...upstreamUrl.searchParams.entries()]) {
      if (urlVal === '' && primaryValue && !usedParams.has(api.paramName)) {
        upstreamUrl.searchParams.set(urlKey, primaryValue);
        usedParams.add(api.paramName);
        break;
      }
    }

    // Step C: Append ALL remaining user params that weren't used yet
    for (const [key, value] of Object.entries(userParams)) {
      if (!usedParams.has(key)) {
        upstreamUrl.searchParams.set(key, value);
        usedParams.add(key);
      }
    }

    // 10. Build headers for upstream
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': req.headers['accept'] || '*/*',
    };
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

    if (api.optionalHeaders) {
      const headersObj = api.optionalHeaders instanceof Map
        ? Object.fromEntries(api.optionalHeaders)
        : api.optionalHeaders;
      Object.assign(headers, headersObj);
    }

    // 11. Make upstream request
    const fetchOptions = {
      method: api.method,
      headers,
      timeout: 30000,
    };

    if (api.method !== 'GET' && api.method !== 'HEAD') {
      let bodyData = { ...req.body };
      Object.entries(req.query).forEach(([k, v]) => {
        if (k !== 'key') bodyData[k] = v;
      });

      const contentType = headers['Content-Type'] || headers['content-type'] || 'application/x-www-form-urlencoded';
      headers['Content-Type'] = contentType;

      if (contentType.includes('application/json')) {
        fetchOptions.body = JSON.stringify(bodyData);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        fetchOptions.body = new URLSearchParams(bodyData).toString();
      } else {
        fetchOptions.body = JSON.stringify(bodyData);
      }
    }

    const upstreamUrlString = upstreamUrl.toString();
    const cacheKey = `${api.method}:${upstreamUrlString}${fetchOptions.body ? `|${fetchOptions.body}` : ''}`;

    // Check if response is in cache
    const cachedResponse = await Cache.findOne({ cacheKey });
    
    if (cachedResponse) {
      const responseTime = Date.now() - startTime;
      
      try {
        const jsonResponse = JSON.parse(cachedResponse.responseBody);
        res.status(cachedResponse.statusCode).set('Content-Type', cachedResponse.contentType).json(jsonResponse);
      } catch {
        res.status(cachedResponse.statusCode).set('Content-Type', cachedResponse.contentType).send(cachedResponse.responseBody);
      }

      // Update metrics (asynchronous background)
      setImmediate(() => {
        apiKey.lastUsedAt = new Date();
        apiKey.usageToday += 1;
        apiKey.usageThisMonth += 1;
        apiKey.totalUsage += 1;
        apiKey.save().catch(err => logger.error('Key update err: ' + err.message));

        api.totalRequests += 1;
        api.save().catch(err => logger.error('API update err: ' + err.message));

        logData.statusCode = cachedResponse.statusCode;
        logData.responseTime = responseTime;
        logData.responseSize = Buffer.byteLength(cachedResponse.responseBody);
        saveLog(logData).catch(err => logger.error('Log save err: ' + err.message));
      });
      return;
    }

    const upstreamResponse = await fetch(upstreamUrlString, fetchOptions);

    const responseBody = await upstreamResponse.text();
    const responseTime = Date.now() - startTime;
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    // 12. Return response INSTANTLY to the client
    try {
      const jsonResponse = JSON.parse(responseBody);
      res.status(upstreamResponse.status).set('Content-Type', contentType).json(jsonResponse);
    } catch {
      res.status(upstreamResponse.status).set('Content-Type', contentType).send(responseBody);
    }

    // Save to Cache & Update metrics (asynchronous background)
    setImmediate(() => {
      // Save cache (only if successful response)
      if (upstreamResponse.status >= 200 && upstreamResponse.status < 300) {
        Cache.create({
          cacheKey,
          responseBody,
          statusCode: upstreamResponse.status,
          contentType
        }).catch(err => logger.error('Cache save err: ' + err.message));
      }

      apiKey.lastUsedAt = new Date();
      apiKey.usageToday += 1;
      apiKey.usageThisMonth += 1;
      apiKey.totalUsage += 1;
      apiKey.save().catch(err => logger.error('Key update err: ' + err.message));

      api.totalRequests += 1;
      api.save().catch(err => logger.error('API update err: ' + err.message));

      logData.statusCode = upstreamResponse.status;
      logData.responseTime = responseTime;
      logData.responseSize = Buffer.byteLength(responseBody);
      saveLog(logData).catch(err => logger.error('Log save err: ' + err.message));
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Gateway error for /${endpoint}: ${error.message}`);

    logData.statusCode = 502;
    logData.responseTime = responseTime;
    logData.error = error.message;
    saveLog(logData).catch(() => {});

    res.status(502).json({
      success: false,
      error: 'Gateway error. The upstream API is unreachable.',
    });
  }
};

/**
 * Save request log to database
 */
const saveLog = async (data) => {
  try {
    await RequestLog.create(data);
  } catch (err) {
    logger.error(`Failed to save request log: ${err.message}`);
  }
};

module.exports = { handleRequest };
