const Review = require('./../models/reviewModel');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.user) req.body.user = req.user.id;

  const filteredBody = filterObj(req.body, 'rating', 'review', 'car', 'user');

  const review = await Review.create(filteredBody);

  res.status(201).json({
    status: 'success',
    data: {
      review
    }
  });
});

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Review.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // const doc = await features.query.explain();
  const doc = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc
    }
  });
});

exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  res.status(200).json({
    status: 'success',
    data: review
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'rating', 'review');

  const updatedReview = await Review.findByIdAndUpdate(
    req.params.reviewId,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: updatedReview
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  await Review.findByIdAndDelete(req.params.reviewId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
