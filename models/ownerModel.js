const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const ownerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'A owner must provide a first name'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'A owner must provide a last name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide your phone number'],
      unique: true,
      trim: true
    },
    photo: {
      type: String,
      default: 'default.jpg',
      required: [true, 'Please upload a photo so others can see you']
    },
    role: {
      type: String,
      enum: ['owner'],
      default: 'owner'
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    confirmPassword: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function(el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!'
      }
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    loggedInAt: Date,
    loggedOutAt: Date,
    loggedIn: {
      type: Boolean,
      default: false
    },
    loggedOut: {
      type: Boolean,
      default: false
    },
    passwordChangedAt: Date,
    otp: String,
    otpExpires: Date,
    emailVerified: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    nationalId: String,
    about: {
      type: String,
      maxlength: [450, "'About me must have less or equal then 450 characters'"]
    },
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

ownerSchema.virtual('cars', {
  ref: 'Car',
  foreignField: 'owner',
  localField: '_id'
});

ownerSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

ownerSchema.pre(/^find/, function(next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

ownerSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete confirmPassword field
  this.confirmPassword = undefined;
  next();
});

ownerSchema.methods.generateOTP = function() {
  let digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  // Hash the OTP with cost of 12
  this.otp = crypto
    .createHash('sha256')
    .update(OTP)
    .digest('hex');

  // set otp expire time
  this.otpExpires = new Date(new Date().getTime() + 10 * 60 * 1000);

  return OTP;
};

ownerSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

ownerSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const Owner = mongoose.model('Owner', ownerSchema);

module.exports = Owner;
