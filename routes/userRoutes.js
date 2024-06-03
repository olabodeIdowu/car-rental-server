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
} = require('../controllers/userController');
const {
  signup,
  verifyOtp,
  login,
  protect,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  sendVerificationOtp,
  restrictTo
} = require('../controllers/authUserController');

const router = express.Router();

router.post('/signup-user-with-email', signup);
router.post('/verify-user-OTP', verifyOtp);
router.post('/login-user-with-email', login);
router.post('/logout-user', protect, restrictTo('user'), logout);
router.post('/forgot-user-password', forgotPassword);
router.post('/reset-user-password', resetPassword);
router.post(
  '/update-user-password',
  protect,
  restrictTo('user'),
  updatePassword
);
router.post(
  '/send-user-verification-otp',
  protect,
  restrictTo('user'),
  sendVerificationOtp
);

router.patch('/change-user-email', protect, restrictTo('user'), updateEmail);
router.patch('/change-user-phone', protect, restrictTo('user'), updatePhone);
router.patch('/:userId/delete-user', protect, deleteUser);

router.route('/').get(getAllUsers);

router
  .route('/:userId')
  .get(protect, getUser)
  .patch(protect, uploadUserPhoto, resizeUserPhoto, updateUser);

module.exports = router;
