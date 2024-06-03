const express = require('express');
const {
  getAllFavorites,
  createFavorite,
  getFavorite,
  updateFavorite,
  deleteFavorite
} = require('../controllers/favoriteController');
const { protect } = require('../controllers/authUserController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllFavorites)
  .post(protect, createFavorite);

router
  .route('/:favoriteId')
  .get(protect, updateFavorite)
  .patch(protect, getFavorite)
  .delete(protect, deleteFavorite);
module.exports = router;
