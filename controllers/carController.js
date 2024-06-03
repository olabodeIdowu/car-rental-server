const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const Car = require('./../models/carModel');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/cars');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `car-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // console.log(file);
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

exports.uploadCarImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeCarImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.files.cover = `car-${req.user.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/cars/${req.files.cover}`);

  // 2) Images
  req.files.imgs = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `car-${req.user.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/cars/${filename}`);

      req.files.imgs.push(filename);
    })
  );

  next();
});

exports.createCar = catchAsync(async (req, res, next) => {
  console.log(req.files);
  if (!req.body.owner) req.body.owner = req.user.id;
  const filteredBody = filterObj(
    req.body,
    'name',
    'price',
    'color',
    'seatNumber',
    'gasType',
    'location',
    'carBrand',
    'carType',
    'carTransmissionType'
  );
  filteredBody.owner = req.body.owner;

  if (req.files) {
    filteredBody.imageCover = req.files.cover;
    filteredBody.images = req.files.imgs;
  }

  const car = await Car.create(filteredBody);
  // SEND RESPONSE
  res.status(201).json({
    status: 'success',
    data: {
      car
    }
  });
});

exports.getAllCars = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.ownerId) filter = { owner: req.params.ownerId };

  const features = new APIFeatures(Car.find(filter), req.query)
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

exports.getCar = catchAsync(async (req, res, next) => {
  const review = await Car.findById(req.params.carId);
  res.status(200).json({
    status: 'success',
    data: review
  });
});

exports.updateCar = catchAsync(async (req, res, next) => {
  // console.log(req.files.cover, req.files.imgs);
  const filteredBody = filterObj(
    req.body,
    'name',
    'price',
    'color',
    'seatNumber',
    'gasType',
    'carBrand',
    'location',
    'carType',
    'carTransmissionType',
    'priceDiscount',
    'description'
  );

  if (req.files) {
    filteredBody.imageCover = req.files.cover;
    filteredBody.images = req.files.imgs;
  }

  // console.log(filteredBody);
  const updatedCar = await Car.findByIdAndUpdate(
    req.params.carId,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );
  res.status(200).json({
    status: 'success',
    data: updatedCar
  });
});

exports.deleteCar = catchAsync(async (req, res, next) => {
  await Car.findByIdAndDelete(req.params.carId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.aliasTopCars = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  // req.query.fields = 'name,price,ratingsAverage';
  next();
};

exports.getCarStats = catchAsync(async (req, res, next) => {
  const stats = await Car.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numCars: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// /cars-within/233/center/34.111745,-118.113491/unit/mi
exports.getCarsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const cars = await Car.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: cars.length,
    data: {
      data: cars
    }
  });
});

// /cars-within/:distance/center/:latlng/unit/:unit
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Car.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
