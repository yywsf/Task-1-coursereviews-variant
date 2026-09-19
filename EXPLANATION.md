# Course Review Board API — Implementation Notes

This project was completed by implementing the missing review-related backend logic for the MongoDB + Express app.

## Files changed

### 1) server/src/models/Review.js
This file defines the `Review` schema.

What was added:
- `courseCode` as a required string
- `rating` as a required integer between 1 and 5
- optional `comment`
- `reviewedBy` as an ObjectId reference to the `User` model
- timestamps enabled via `{ timestamps: true }`
- unique compound index on `{ courseCode, reviewedBy }` so one user can only review a course once

Why it matters:
- It enforces the data rules in the task description.
- It prevents duplicate reviews for the same user and course.

### 2) server/src/controllers/reviewController.js
This file contains the main review API logic.

What was implemented:
- Joi validation for create and update requests
- `getAllReviews` to fetch all reviews
- `getReview` to fetch one review by id
- `createReview` to create a new review
- `updateReview` to update a review
- `deleteReview` to delete a review
- `getCourseSummary` to compute the course summary using MongoDB aggregation
- `.populate('reviewedBy', 'name email')` for review responses

Important design decisions:
- Validation ensures invalid data is rejected before hitting MongoDB.
- The aggregation uses MongoDB’s pipeline instead of loading every match into Node.js for averaging.
- Route ordering matters: `/summary` is registered before `/:id` so it does not get mistaken for a review id.
- The controller returns clean JSON responses and handles duplicate review conflicts with a 409 error.

### 3) server/src/routes/reviews.js
This file wires the API routes to the controller functions.

Routes included:
- `GET /api/reviews/summary`
- `GET /api/reviews/:id`
- `GET /api/reviews`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

Why the order matters:
- If `/:id` were registered before `/summary`, then `/api/reviews/summary` could be treated as an id lookup instead of the aggregation endpoint.

### 4) server/.env
This file was created to provide the MongoDB connection string.

Why it matters:
- The app needs `MONGO_URI` and `PORT` to connect to MongoDB and start the API server.

## What the app now does

You now have a working review backend where users can:
- create reviews
- read all reviews
- read one review
- update a review
- delete a review
- get a per-course aggregate summary
- fetch review data with populated user info for `reviewedBy`

## Main task requirement covered
This implementation follows the task instructions:
- full CRUD for reviews
- request validation with Joi
- compound unique index on course/user
- aggregation summary using `.aggregate()`
- populated user information instead of just raw ObjectId

## Notes
The server was also verified to start successfully after implementation, with MongoDB connection and API startup confirmed in the terminal output.
