const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');
const { validateApiPayload, validateKeyPayload, sanitize } = require('../utils/validators');
const { generateApiKey, maskKey } = require('../utils/keyGenerator');

// ==========================================
// API CRUD Operations
// ==========================================

/**
 * List all APIs
 * GET /api/admin/apis
 */
const listApis = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { customEndpoint: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Api.countDocuments(query);
    const apis = await Api.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: apis,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`List APIs error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch APIs.' });
  }
};

/**
 * Get single API details
 * GET /api/admin/apis/:id
 */
const getApi = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, error: 'API not found.' });
    }
    res.json({ success: true, data: api });
  } catch (error) {
    logger.error(`Get API error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch API.' });
  }
};

/**
 * Create new API
 * POST /api/admin/apis
 */
const createApi = async (req, res) => {
  try {
    const data = req.body;
    const { isValid, errors } = validateApiPayload(data);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
    }

    // Check duplicate endpoint
    const existing = await Api.findOne({ customEndpoint: data.customEndpoint.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Custom endpoint already exists.' });
    }

    const api = new Api({
      name: sanitize(data.name),
      description: sanitize(data.description || ''),
      customEndpoint: data.customEndpoint.toLowerCase(),
      upstreamUrl: data.upstreamUrl,
      method: data.method.toUpperCase(),
      paramName: data.paramName,
      optionalHeaders: data.optionalHeaders || {},
      status: 'active',
      rateLimit: {
        requestsPerDay: data.rateLimit?.requestsPerDay || 10000,
        requestsPerMinute: data.rateLimit?.requestsPerMinute || 100,
        concurrentRequests: data.rateLimit?.concurrentRequests || 50,
      },
      caching: {
        enabled: data.caching?.enabled || false,
        ttl: data.caching?.ttl || 3600,
      },
      createdBy: req.admin?.email || 'admin',
    });

    await api.save();
    logger.info(`API created: ${api.name} (${api.customEndpoint})`);

    res.status(201).json({ success: true, data: api });
  } catch (error) {
    logger.error(`Create API error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'This endpoint already exists. Use a different endpoint name.' });
    }
    res.status(500).json({ success: false, error: `Failed to create API: ${error.message}` });
  }
};

/**
 * Update API
 * PUT /api/admin/apis/:id
 */
const updateApi = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, error: 'API not found.' });
    }

    const data = req.body;
    const { isValid, errors } = validateApiPayload({ ...api.toObject(), ...data });

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
    }

    // If endpoint changed, check for duplicates
    if (data.customEndpoint && data.customEndpoint !== api.customEndpoint) {
      const existing = await Api.findOne({ customEndpoint: data.customEndpoint.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Custom endpoint already exists.' });
      }
    }

    // Update fields
    const allowedFields = ['name', 'description', 'customEndpoint', 'upstreamUrl', 'method', 'paramName', 'optionalHeaders', 'rateLimit', 'caching'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        api[field] = data[field];
      }
    });

    await api.save();
    logger.info(`API updated: ${api.name}`);

    res.json({ success: true, data: api });
  } catch (error) {
    logger.error(`Update API error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update API.' });
  }
};

/**
 * Delete API
 * DELETE /api/admin/apis/:id
 */
const deleteApi = async (req, res) => {
  try {
    const api = await Api.findByIdAndDelete(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, error: 'API not found.' });
    }

    logger.info(`API deleted: ${api.name}`);
    res.json({ success: true, message: 'API deleted successfully.' });
  } catch (error) {
    logger.error(`Delete API error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete API.' });
  }
};

/**
 * Clone API
 * POST /api/admin/apis/:id/clone
 */
const cloneApi = async (req, res) => {
  try {
    const original = await Api.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, error: 'API not found.' });
    }

    // Generate unique endpoint
    let newEndpoint = `${original.customEndpoint}-copy`;
    let counter = 2;
    while (await Api.findOne({ customEndpoint: newEndpoint })) {
      newEndpoint = `${original.customEndpoint}-copy-${counter}`;
      counter++;
    }

    const cloned = new Api({
      name: req.body.name || `${original.name} - Copy`,
      description: original.description,
      customEndpoint: newEndpoint,
      upstreamUrl: original.upstreamUrl,
      method: original.method,
      paramName: original.paramName,
      optionalHeaders: original.optionalHeaders,
      status: 'active',
      rateLimit: original.rateLimit,
      caching: original.caching,
      createdBy: req.admin?.email || 'admin',
    });

    await cloned.save();
    logger.info(`API cloned: ${original.name} → ${cloned.name}`);

    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    logger.error(`Clone API error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to clone API.' });
  }
};

/**
 * Update API status (suspend/resume)
 * PATCH /api/admin/apis/:id/status
 */
const updateApiStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use: active, suspended, maintenance.' });
    }

    const api = await Api.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!api) {
      return res.status(404).json({ success: false, error: 'API not found.' });
    }

    logger.info(`API status updated: ${api.name} → ${status}`);
    res.json({ success: true, data: api });
  } catch (error) {
    logger.error(`Update API status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update API status.' });
  }
};

// ==========================================
// API Key Operations
// ==========================================

/**
 * List all API keys
 * GET /api/admin/keys
 */
const listKeys = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { 'metadata.name': { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ApiKey.countDocuments(query);
    const keys = await ApiKey.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: keys,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`List keys error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch keys.' });
  }
};

/**
 * Get single key details
 * GET /api/admin/keys/:id
 */
const getKey = async (req, res) => {
  try {
    const key = await ApiKey.findById(req.params.id);
    if (!key) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    res.json({ success: true, data: key });
  } catch (error) {
    logger.error(`Get key error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch key.' });
  }
};

/**
 * Generate new API key
 * POST /api/admin/keys
 */
const createKey = async (req, res) => {
  try {
    const data = req.body;
    const { isValid, errors } = validateKeyPayload(data);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
    }

    const rawKey = generateApiKey();

    const apiKey = new ApiKey({
      key: rawKey,
      status: 'active',
      allowedApis: data.allowedApis || ['*'],
      expiresAt: data.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 year
      createdBy: req.admin?.email || 'admin',
      metadata: {
        name: data.metadata?.name || 'Unnamed Key',
        description: data.metadata?.description || '',
      },
    });

    await apiKey.save();
    logger.info(`API key generated: ${maskKey(rawKey)}`);

    res.status(201).json({
      success: true,
      data: {
        ...apiKey.toObject(),
        rawKey, // Keep for frontend initial result display
      },
      message: 'API Key generated successfully.',
    });
  } catch (error) {
    logger.error(`Create key error: ${error.message}`);
    res.status(500).json({ success: false, error: `Failed to generate key: ${error.message}` });
  }
};

/**
 * Update key status (suspend/revoke)
 * PATCH /api/admin/keys/:id/status
 */
const updateKeyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'revoked'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use: active, suspended, revoked.' });
    }

    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!key) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    logger.info(`Key status updated: ${key.key} → ${status}`);
    res.json({ success: true, data: key });
  } catch (error) {
    logger.error(`Update key status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update key status.' });
  }
};

/**
 * Delete API key
 * DELETE /api/admin/keys/:id
 */
const deleteKey = async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    logger.info(`Key deleted: ${key.key}`);
    res.json({ success: true, message: 'Key deleted successfully.' });
  } catch (error) {
    logger.error(`Delete key error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete key.' });
  }
};

/**
 * Get key usage stats
 * GET /api/admin/keys/:id/usage
 */
const getKeyUsage = async (req, res) => {
  try {
    const key = await ApiKey.findById(req.params.id);
    if (!key) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    // Get usage from request logs
    const RequestLog = require('../models/RequestLog');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await RequestLog.countDocuments({
      keyId: key._id,
      createdAt: { $gte: today },
    });

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthCount = await RequestLog.countDocuments({
      keyId: key._id,
      createdAt: { $gte: monthStart },
    });

    const totalCount = await RequestLog.countDocuments({ keyId: key._id });

    // Get daily usage for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyUsage = await RequestLog.aggregate([
      { $match: { keyId: key._id, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        today: todayCount,
        thisMonth: monthCount,
        total: totalCount,
        dailyUsage,
        daysRemaining: key.daysRemaining,
      },
    });
  } catch (error) {
    logger.error(`Get key usage error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch key usage.' });
  }
};

module.exports = {
  listApis, getApi, createApi, updateApi, deleteApi, cloneApi, updateApiStatus,
  listKeys, getKey, createKey, updateKeyStatus, deleteKey, getKeyUsage,
};
