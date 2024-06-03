// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Car = require('./carModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    car: {
      type: mongoose.Schema.ObjectId,
      ref: 'Car',
      required: [true, 'Review must belong to a car.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ car: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'car',
    select: 'name'
  }).populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function(carId) {
  const stats = await this.aggregate([
    {
      $match: { car: carId }
    },
    {
      $group: {
        _id: '$car',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Car.findByIdAndUpdate(carId, {
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Car.findByIdAndUpdate(carId, {
      ratingsAverage: 0
    });
  }
};

reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.car);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.car);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
