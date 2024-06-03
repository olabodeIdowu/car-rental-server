const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(150, 150)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  // To allow for nested GET reviews on user (hack)
  let filter = {};
  if (req.params.userId) filter = { user: req.params.userId };

  const features = new APIFeatures(User.find(filter), req.query)
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
      doc
    }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  console.log(req.params.userId);
  // 1) Update user document
  const user = await User.findById(req.params.userId);

  res.status(200).json({
    status: 'success',
    data: {
      user: user
    }
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'firstName', 'lastName');

  if (req.file) filteredBody.photo = req.file.filename;
  console.log(filteredBody);

  //  Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.params.userId,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );
  // console.log(updatedUser);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.updateEmail = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs email, phone data
  if (!req.body.email) {
    return next(new AppError('This route is for user email updates.', 400));
  }

  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('user not found', 404));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'email');

  //  Update user document

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  updatedUser.emailVerified = false;
  await updatedUser.save({ validateBeforeSave: false });

  // console.log(updatedUser);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.updatePhone = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs email, phone data
  if (!req.body.phone) {
    return next(new AppError('This route is for user email updates.', 400));
  }

  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('user not found', 404));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'phone');

  //  Update user document

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  updatedUser.phoneVerified = false;
  await updatedUser.save({ validateBeforeSave: false });

  // console.log(updatedUser);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.params.userId,
    { active: false },
    {
      new: true,
      runValidators: true
    }
  ).select('+active');

  res.status(204).json({
    status: 'success',
    data: null
  });
});
