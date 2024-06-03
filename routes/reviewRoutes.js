const express = require('express');
const {
  getAllReviews,
  createReview,
  getReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../controllers/authUserController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllReviews)
  .post(protect, createReview);

router
  .route('/:reviewId')
  .get(getReview)
  .patch(protect, updateReview)
  .delete(protect, deleteReview);
module.exports = router;
