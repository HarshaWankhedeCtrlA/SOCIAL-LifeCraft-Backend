'use strict';

const getCategoryModel              = require('../models/master/Category');
const getCommunityTypeModel         = require('../models/master/CommunityType');
const getCommunityFilterOptionModel = require('../models/master/CommunityFilterOption');
const getContentTypeModel           = require('../models/master/ContentType');
const getNotificationTypeModel      = require('../models/master/NotificationType');
const getReportReasonModel          = require('../models/master/ReportReason');

const MODELS = {
  categories:             { get: getCategoryModel },
  communitytypes:         { get: getCommunityTypeModel },
  communityfilteroptions: { get: getCommunityFilterOptionModel },
  contenttypes:           { get: getContentTypeModel },
  notificationtypes:      { get: getNotificationTypeModel },
  reportreasons:          { get: getReportReasonModel },
};

const cache = {};
const TTL_MS = 5 * 60 * 1000;

async function getMasterList(name, filter = {}) {
  const entry = MODELS[name];
  if (!entry) throw new Error(`Unknown master collection: ${name}`);

  const cacheKey = Object.keys(filter).length
    ? `${name}:${JSON.stringify(filter)}`
    : name;

  const now = Date.now();
  const cached = cache[cacheKey];
  if (cached && (now - cached.time) < TTL_MS) return cached.data;

  const Model = entry.get()();
  const data = await Model
    .find({ status: 'active', ...filter })
    .sort({ display_order: 1 })
    .lean();

  cache[cacheKey] = { data, time: now };
  return data;
}

async function isValidMasterCode(name, code, filter = {}) {
  if (!code) return false;
  const list = await getMasterList(name, filter);
  return list.some(item => item.code.toUpperCase() === String(code).toUpperCase());
}

function clearCache(name) {
  if (!name) return Object.keys(cache).forEach(k => delete cache[k]);
  Object.keys(cache)
    .filter(k => k === name || k.startsWith(`${name}:`))
    .forEach(k => delete cache[k]);
}

module.exports = { getMasterList, isValidMasterCode, clearCache };