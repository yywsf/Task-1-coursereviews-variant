import Joi from 'joi';
import { Review } from '../models/Review.js';

const createSchema = Joi.object({
  courseCode: Joi.string().trim().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow('').optional(),
  reviewedBy: Joi.string().hex().length(24).optional()
});

const updateSchema = Joi.object({
  courseCode: Joi.string().trim(),
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().allow('').optional(),
  reviewedBy: Joi.string().hex().length(24).optional()
}).min(1);

function publicReview(review) {
  const reviewedBy = review.reviewedBy;

  return {
    id: review._id.toString(),
    courseCode: review.courseCode,
    rating: review.rating,
    comment: review.comment ?? '',
    reviewedBy: reviewedBy
      ? {
          id: reviewedBy._id ? reviewedBy._id.toString() : reviewedBy.toString(),
          name: reviewedBy.name,
          email: reviewedBy.email
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find()
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ reviews: reviews.map(publicReview) });
  } catch (err) { next(err); }
}

export async function getReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id).populate('reviewedBy', 'name email');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json({ review: publicReview(review.toObject ? review.toObject() : review) });
  } catch (err) { next(err); }
}

export async function getCourseSummary(req, res, next) {
  try {
    const courseCode = String(req.query.courseCode || '').trim().toUpperCase();
    if (!courseCode) {
      return res.status(400).json({ message: 'courseCode query parameter is required' });
    }

    const [summary] = await Review.aggregate([
      { $match: { courseCode } },
      {
        $group: {
          _id: '$courseCode',
          courseCode: { $first: '$courseCode' },
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    if (!summary) {
      return res.status(404).json({ message: 'No reviews found for this course' });
    }

    res.json({
      courseCode: summary.courseCode,
      averageRating: Number(summary.averageRating.toFixed(1)),
      reviewCount: summary.reviewCount
    });
  } catch (err) { next(err); }
}

export async function createReview(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const doc = await Review.create({
      ...value,
      courseCode: value.courseCode.toUpperCase(),
      reviewedBy: value.reviewedBy || undefined
    });

    const review = await Review.findById(doc._id).populate('reviewedBy', 'name email');
    res.status(201).json({ review: publicReview(review.toObject ? review.toObject() : review) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this course' });
    }
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });
    if (Object.keys(value).length === 0) {
      return res.status(400).json({ message: 'At least one field is required for update' });
    }

    const doc = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...value,
          ...(value.courseCode ? { courseCode: value.courseCode.toUpperCase() } : {})
        }
      },
      { new: true, runValidators: true }
    ).populate('reviewedBy', 'name email');

    if (!doc) return res.status(404).json({ message: 'Review not found' });
    res.json({ review: publicReview(doc.toObject ? doc.toObject() : doc) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this course' });
    }
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const doc = await Review.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Review not found' });
    res.json({ ok: true, deletedId: req.params.id });
  } catch (err) { next(err); }
}
