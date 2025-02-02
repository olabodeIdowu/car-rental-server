const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");
const compression = require("compression");
const cors = require("cors");

const AppError = require("./../utils/appError");
const globalErrorHandler = require("./../controllers/errorController");
const carRouter = require("./../routes/carRoutes");
const userRouter = require("./../routes/userRoutes");
const ownerRouter = require("./../routes/ownerRoutes");
const reviewRouter = require("./../routes/reviewRoutes");
const bookingRouter = require("./../routes/bookingRoutes");
const favoriteRouter = require("./../routes/favoriteRoutes");
const netlifyRouter = require("./../routes/netlifyRoutes");

// Start express app
const app = express();

app.enable("trust proxy");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 1) GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.carrentals.com, front-end carrentals.com
// app.use(cors({
//   origin: 'https://www.carrentals.com'
// }))

app.options("*", cors());
// app.options('/api/v1/cars/:id', cors());

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// app.use(
//   hpp({
//     whitelist: [
//       "ratingsQuantity",
//       "ratingsAverage",
//       "price",
//     ],
//   })
// );

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use("/api/v1/cars", carRouter);
app.use("/api/v1/owners", ownerRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/favorites", favoriteRouter);
app.use("/.netlify/functions/app", netlifyRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = serverless(app);
