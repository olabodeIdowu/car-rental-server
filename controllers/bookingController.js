const Booking = require('./../models/bookingModel');
const User = require('./../models/userModel');
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

exports.createBooking = catchAsync(async (req, res, next) => {
  if (!req.body.car) req.body.car = req.params.carId;
  if (!req.body.bookedBy) req.body.bookedBy = req.user.id;

  const filteredBody = filterObj(
    req.body,
    'price',
    'pickupDate',
    'pickupTime',
    'returnDate',
    'returnTime'
  );

  filteredBody.car = req.body.car;
  filteredBody.bookedBy = req.body.bookedBy;

  const booking = await Booking.create(filteredBody);
  res.status(201).json({
    status: 'success',
    data: {
      booking
    }
  });
});

exports.getAllBookings = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.bookingId) filter = { booking: req.params.bookingId };

  const features = new APIFeatures(Booking.find(filter), req.query)
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

exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  res.status(200).json({
    status: 'success',
    data: booking
  });
});

exports.updateBooking = catchAsync(async (req, res, next) => {
  const updatedbooking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    { status: 'cancelled' },
    {
      new: true,
      runValidators: true
    }
  );
  res.status(200).json({
    status: 'success',
    data: updatedbooking
  });
});

exports.deleteBooking = catchAsync(async (req, res, next) => {
  await Booking.findByIdAndDelete(req.params.bookingId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
