const { v4: uuidv4 } = require('uuid');
const { getUsersByIds } = require('../utils/authServiceClient');
const Report = require('../models/Report');
const { REPORT_REASONS } = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

async function attachReportUsers(reports) {
  if (!reports || reports.length === 0) return reports;
  
  const reporterIds = reports.map(r => r.reporterId).filter(Boolean);
  const targetAuthorIds = reports.map(r => r.targetAuthorId).filter(Boolean);
  
  const allUserIds = [...new Set([...reporterIds, ...targetAuthorIds])];
  const usersMap = await getUsersByIds(allUserIds);
  
  return reports.map(report => ({
    ...report,
    reporter: usersMap[report.reporterId]
      ? {
          id: usersMap[report.reporterId].id,
          firstName: usersMap[report.reporterId].firstName,
          lastName: usersMap[report.reporterId].lastName,
          fullName: usersMap[report.reporterId].fullName,
          avatar: usersMap[report.reporterId].avatar
        }
      : null,
    targetAuthor: usersMap[report.targetAuthorId]
      ? {
          id: usersMap[report.targetAuthorId].id,
          firstName: usersMap[report.targetAuthorId].firstName,
          lastName: usersMap[report.targetAuthorId].lastName,
          fullName: usersMap[report.targetAuthorId].fullName,
          avatar: usersMap[report.targetAuthorId].avatar
        }
      : null
  }));
}

// ============================================
// CREATE REPORT (report a post or comment)
// ============================================
exports.createReport = async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const { targetType, targetId, reason, description } = req.body;

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_TYPE', message: 'targetType must be post or comment' }
      });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REASON', message: `reason must be one of: ${REPORT_REASONS.join(', ')}` }
      });
    }

    let postId, targetAuthorId;

    if (targetType === 'post') {
      const post = await Post.findOne({ postId: targetId });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' }
        });
      }
      postId = post.postId;
      targetAuthorId = post.authorId;
    } else {
      const comment = await Comment.findOne({ commentId: targetId });
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: { code: 'COMMENT_NOT_FOUND', message: 'Comment not found' }
        });
      }
      postId = comment.postId;
      targetAuthorId = comment.authorId;
    }

    // Can't report your own content
    if (targetAuthorId === reporterId) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_REPORT_OWN_CONTENT', message: 'You cannot report your own content' }
      });
    }

    const report = new Report({
      reportId: uuidv4(),
      reporterId,
      targetType,
      targetId,
      postId,
      targetAuthorId,
      reason,
      description: description || ''
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Content reported. Our moderation team will review it shortly.',
      data: report
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REPORTED', message: 'You have already reported this content' }
      });
    }
    next(error);
  }
};

// ============================================
// GET MY REPORTS (reports filed by current user)
// ============================================
exports.getMyReports = async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [reports, total] = await Promise.all([
      Report.find({ reporterId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments({ reporterId })
    ]);

    res.json({
      success: true,
      data: { items: reports, total, page: parseInt(page), pageSize: limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN/MODERATOR: GET ALL REPORTS (queue)
// ============================================
exports.getAllReports = async (req, res, next) => {
  try {
    const { status, targetType, reason, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;
    if (reason) query.reason = reason;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(query)
    ]);
const items = await attachReportUsers(reports);
    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN/MODERATOR: REVIEW A REPORT (resolve/dismiss)
// ============================================
exports.reviewReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const moderatorId = req.user.id;
    const { status, moderatorNotes, actionTaken } = req.body;

    if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'status must be reviewing, resolved, or dismissed' }
      });
    }

    const report = await Report.findOne({ reportId: id });
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' }
      });
    }

    const updates = {
      status,
      reviewedBy: moderatorId,
      reviewedAt: new Date()
    };
    if (moderatorNotes !== undefined) updates.moderatorNotes = moderatorNotes;
    if (actionTaken !== undefined) updates.actionTaken = actionTaken;

    // If moderator decides to remove content, actually hide/remove it
    if (actionTaken === 'content_removed') {
      if (report.targetType === 'post') {
        await Post.updateOne({ postId: report.targetId }, { $set: { status: 'reported' } });
      } else {
        await Comment.updateOne({ commentId: report.targetId }, { $set: { status: 'hidden' } });
      }
    }

    await Report.updateOne({ _id: report._id }, { $set: updates });
    const updatedReport = await Report.findOne({ reportId: id });

    res.json({
      success: true,
      message: 'Report reviewed successfully',
      data: updatedReport
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET REPORT COUNT FOR A SPECIFIC TARGET
// (useful for auto-flagging content with many reports)
// ============================================
exports.getReportCount = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;

    const count = await Report.countDocuments({ targetType, targetId });

    res.json({
      success: true,
      data: { targetType, targetId, reportCount: count }
    });

  } catch (error) {
    next(error);
  }
};