const Favorite = require('./../models/favoriteModel');
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

exports.createFavorite = catchAsync(async (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.favoriteBy) req.body.favoriteBy = req.user.id;

  const filteredBody = filterObj(req.body, 'isFavorite');

  filteredBody.car = req.body.car;
  filteredBody.favoriteBy = req.body.favoriteBy;

  const favorite = await Favorite.create(filteredBody);

  res.status(201).json({
    status: 'success',
    data: {
      favorite
    }
  });
});

exports.getAllFavorites = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.favoriteId) filter = { favorite: req.params.favoriteId };

  const features = new APIFeatures(Favorite.find(filter), req.query)
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
    data: doc
  });
});

exports.getFavorite = catchAsync(async (req, res, next) => {
  const review = await Favorite.findById(req.params.favoriteId);
  res.status(200).json({
    status: 'success',
    data: review
  });
});

exports.updateFavorite = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'isFavorite');

  const updatedFavorite = await Favorite.findByIdAndUpdate(
    req.params.favoriteId,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: updatedFavorite
  });
});

exports.deleteFavorite = catchAsync(async (req, res, next) => {
  await Favorite.findByIdAndDelete(req.params.favoriteId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
