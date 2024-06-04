const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const Email = require("./../utils/email");
const Owner = require("./../models/ownerModel");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const filterObj = function(obj, ...allowedFields) {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
const signUserToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const signUserRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const userToken = signUserToken(user._id);
  const userRefreshToken = signUserRefreshToken(user._id);
  // If everything ok, send token to client
  res.cookie("jwtUserToken", userToken, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  res.cookie("jwtUserRefreshToken", userRefreshToken, {
    expires: new Date(
      Date.now() +
        process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    userToken,
    userRefreshToken,
    data: {
      user,
    },
  });
};

// ---------------------- signup -------------------------
exports.signupOwner = catchAsync(async (req, res, next) => {
  // 1) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    "email",
    "firstName",
    "lastName",
    "password",
    "confirmPassword",
    "phone",
    "photo"
  );

  const newUser = await Owner.create(filteredBody);
  if (!newUser) {
    return next(new AppError("requested data contain invalid values", 422));
  }

  const url = undefined;
  // get OTP
  const otp = newUser.generateOTP();
  console.log(otp);
  // send welcome email to user email address
  await new Email(newUser, url).sendWelcome();
  await newUser.save({ validateBeforeSave: false });

  // send otp to user email address for verifcation
  await new Email(newUser, url, otp).sendOTP();

  // send token to user
  createSendToken(newUser, 201, req, res);
});

// ---------------------- verify otp -------------------------

exports.verifyOtp = catchAsync(async (req, res, next) => {
  // check if req.body contains otp
  const { otp } = req.body;
  if (!otp)
    return next(
      new AppError(
        "Unprocessable Entity - requested data contain invalid values.",
        422
      )
    );

  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  const user = await Owner.findOne({
    otp: hashedToken,
    otpExpires: { $gt: new Date(Date.now()) },
  });

  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  // 2) If OTP has not expired, and there is user, set the new password
  user.otp = undefined;
  user.otpExpires - undefined;
  user.emailVerified = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(
      new AppError(
        "Unprocessable Entity - requested data contain invalid values.",
        422
      )
    );

  const user = await Owner.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  user.loggedInAt = new Date(Date.now());
  user.loggedIn = true;
  await user.save({ validateBeforeSave: false });
  createSendToken(user, 200, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwtUserToken) {
    token = req.cookies.jwtUserToken;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await Owner.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

// ---------------------- logged In -------------------------
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwtUserToken) {
    // 1) verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwtUserToken,
      process.env.JWT_SECRET
    );

    // 2) Check if user still exists
    const currentUser = await Owner.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401
        )
      );
    }

    // 3) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }

    // THERE IS A LOGGED IN USER
    res.locals.user = currentUser;
    return next();
  }
  next();
});

// ---------------------- restrict to -------------------------

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// ---------------------- logout -------------------------

exports.logout = catchAsync(async (req, res, next) => {
  const user = await Owner.findById(req.user.id);
  if (!user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  res.cookie("jwtUserToken", "loggedout", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  user.loggedOutAt = new Date(Date.now());
  user.loggedOut = true;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: "success" });
});

// ---------------------- forgot password -------------------------

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await Owner.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }

  const otp = user.generateOTP();
  console.log(otp);
  await user.save({ validateBeforeSave: false });

  // send url and otp
  const resetUrl = `${req.protocol}://${req.get("host")}/reset-password`;

  await new Email(user, resetUrl, otp).sendOTP();

  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

// ---------------------- reset password -------------------------

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { otp, password, confirmPassword } = req.body;
  if (!otp)
    return next(
      new AppError(
        "Unprocessable Entity - requested data contain invalid values.",
        422
      )
    );

  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  const user = await Owner.findOne({
    otp: hashedToken,
    otpExpires: { $gt: new Date(Date.now()) },
  });

  // 2) If OTP has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  user.password = password;
  user.confirmPassword = confirmPassword;
  user.passwordChangedAt = new Date(Date.now());
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  const url = undefined;

  await new Email(user, url, otp).sendPasswordResetSuccess();
  createSendToken(user, 200, req, res);
});

// ---------------------- update password -------------------------

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await Owner.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordChangedAt = new Date(Date.now());
  await user.save();

  // User.findByIdAndUpdate will NOT work as intended!
  const url = undefined;

  await new Email(user).sendPasswordResetSuccess();
  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.sendVerificationOtp = catchAsync(async (req, res, next) => {
  const newUser = await Owner.findOne({ email: req.user.email });

  if (!newUser) {
    return next(new AppError("you are not logged in!", 422));
  }

  const url = undefined;

  // get email OTP
  const otp = newUser.generateOTP();
  console.log(otp);
  await newUser.save({ validateBeforeSave: false });

  // send email message to confirm user email address
  await new Email(newUser, url, otp).sendOTP();

  res.status(200).json({
    status: "success",
    message:
      "email containing your otp as successfully been sent to your email.",
  });
});
