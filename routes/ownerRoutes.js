const express = require('express');
const {
  updateUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateEmail,
  updatePhone,
  uploadUserPhoto,
  resizeUserPhoto
} = require('../controllers/ownerController');
const {
  signupOwner,
  verifyOtp,
  login,
  protect,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  sendVerificationOtp,
  restrictTo
} = require('../controllers/authOwnerController');

const router = express.Router();

router.post('/signup-owner-with-email', signupOwner);
router.post('/verify-owner-OTP', verifyOtp);
router.post('/login-owner-with-email', login);
router.post('/logout-owner', protect, restrictTo('owner'), logout);
router.post('/forgot-owner-password', forgotPassword);
router.post('/reset-owner-password', resetPassword);
router.post(
  '/update-owner-password',
  protect,
  restrictTo('owner'),
  updatePassword
);
router.post(
  '/send-owner-verification-otp',
  protect,
  restrictTo('owner'),
  sendVerificationOtp
);

router.patch('/change-owner-email', protect, restrictTo('owner'), updateEmail);
router.patch('/change-owner-phone', protect, restrictTo('owner'), updatePhone);
router.patch('/:ownerId/delete-user', protect, deleteUser);

router.route('/').get(getAllUsers);

router
  .route('/:ownerId')
  .get(getUser)
  .patch(protect, uploadUserPhoto, resizeUserPhoto, updateUser);

module.exports = router;
