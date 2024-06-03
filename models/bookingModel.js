const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.ObjectId,
      ref: 'Car',
      required: [true, 'Booking must belong to a Car!']
    },
    bookedBy: {
      type: String,
      required: [true, 'Booking must belong to a User!']
    },
    price: {
      type: Number,
      required: [true, 'Booking must have a price.']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    paid: {
      type: Boolean,
      default: true
    },
    pickupDate: {
      type: Date,
      required: [true, 'Booking must have a pickup date']
    },
    pickupTime: {
      type: String,
      required: [true, 'Booking must have a pickup time']
    },
    returnDate: {
      type: Date,
      required: [true, 'Booking must have a return date']
    },
    returnTime: {
      type: String,
      required: [true, 'Booking must have a return time']
    },
    status: {
      type: String,
      default: 'upcoming',
      enum: ['upcoming', 'cancelled', 'completed']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

bookingSchema.pre(/^find/, function(next) {
  this.populate('user').populate('car');
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
