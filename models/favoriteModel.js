const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.ObjectId,
    ref: 'Car',
    required: [true, 'favorite must belong to a car!']
  },
  favoriteBy: {
    type: String,
    required: [true, 'A car must be favorite by a User!']
  },
  isFavorite: {
    type: Boolean,
    default: false,
    required: [true, 'A car must be favorite to a User!']
  }
});

favoriteSchema.pre(/^find/, function(next) {
  this.populate('favoriteBy').populate({
    path: 'car',
    select: 'name'
  });
  next();
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
