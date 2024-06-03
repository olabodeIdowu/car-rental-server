const express = require('express');
const {
  getAllBookings,
  createBooking,
  getBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController');
const { protect } = require('../controllers/authUserController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllBookings)
  .post(protect, createBooking);

router
  .route('/:bookingId')
  .get(protect, getBooking)
  .patch(protect, updateBooking)
  .delete(protect, deleteBooking);
module.exports = router;
