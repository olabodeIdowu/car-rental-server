const express = require('express');
const {
  getAllCars,
  createCar,
  getCar,
  updateCar,
  deleteCar,
  uploadCarImages,
  resizeCarImages
} = require('../controllers/carController');
const { protect } = require('../controllers/authOwnerController');
const bookingRouter = require('./bookingRoutes');
const favoriteRouter = require('./favoriteRoutes');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/:carId/bookings', bookingRouter);
router.use('/:carId/favorites', favoriteRouter);
router.use('/:carId/reviews', reviewRouter);

router
  .route('/')
  .get(getAllCars)
  .post(protect, uploadCarImages, resizeCarImages, createCar);

router
  .route('/:carId')
  .get(getCar)
  .patch(protect, uploadCarImages, resizeCarImages, updateCar)
  .delete(protect, deleteCar);

module.exports = router;
