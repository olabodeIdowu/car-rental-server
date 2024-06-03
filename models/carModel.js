const mongoose = require('mongoose');
const slugify = require('slugify');

const carSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A car must have a name'],
      trim: true,
      maxlength: [40, 'A car name must have less or equal then 40 characters'],
      minlength: [10, 'A car name must have more or equal then 10 characters']
      // validate: [validator.isAlpha, 'car name must only contain characters']
    },
    slug: String,
    ratingsAverage: {
      type: Number,
      default: 0,
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
    },
    price: {
      type: Number,
      required: [true, 'A car must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String
      // required: [true, 'A car must have a cover image']
    },
    carBrand: {
      type: String,
      required: [true, 'A car must have a type'],
      enum: [
        'Bmw',
        'Toyota',
        'Mercedes Benz',
        'Telsa',
        'Acura',
        'Aston Martin',
        'Audi',
        'Bentley',
        'Bugati',
        'Cadillac',
        'Chevrolet',
        'Chrysler',
        'Dacia',
        'Ferrari',
        'Ford',
        'Genesis',
        'Cmc',
        'Honda',
        'Hummer',
        'Hyundai',
        'Infiniti',
        'Isuzu',
        'Jaguar',
        'Jeep',
        'Kia',
        'Larmborghini',
        'LandRover',
        'Lexus',
        'Lotus',
        'Maybach',
        'Mazda',
        'McLaren',
        'Mini alt',
        'Mitsubishi',
        'Nissan',
        'Opel',
        'Peugeot',
        'Porsche',
        'Rolls Royce',
        'Saab',
        'Spyker',
        'Suzuki',
        'Volkswagen',
        'Volvo'
      ]
    },
    carType: {
      type: String,
      required: [true, 'A car must have a type'],
      enum: [
        'Hatchback',
        'Sedan',
        'MPV',
        'SUV',
        'Crossover',
        'Coupe',
        'Convertible'
      ]
    },
    carTransmissionType: {
      type: String,
      required: [true, 'A car must have a transmission type'],
      enum: [
        'Manual',
        'Automatic',
        'CVT',
        'IMT',
        'Clutch',
        'Tiptronic',
        'Direct Shift gearbox',
        'Torque converter'
      ]
    },
    color: {
      type: String,
      required: [true, 'A car must have a color type']
    },
    seatNumber: {
      type: String,
      required: [true, 'A car must have a color type']
    },
    gasType: {
      type: String,
      required: [true, 'A car must have a color type'],
      enum: [
        'Diesel',
        'Gasoline',
        'Ethanol',
        'Petrol',
        'Biodiesel',
        'Premium gas',
        'Electric',
        'Regular',
        'Hybrid',
        'Midgrade',
        'Premium fuels'
      ]
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now()
    },
    location: [
      // GeoJSON
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
      }
    ],
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'Owner'
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// carSchema.index({ price: 1 });
carSchema.index({ price: 1, ratingsAverage: -1 });
carSchema.index({ slug: 1 });
carSchema.index({ location: '2dsphere' });

// Virtual populate
carSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'car',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
carSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
