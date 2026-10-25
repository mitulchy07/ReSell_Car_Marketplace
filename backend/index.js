'use strict';
// Assemble middleware, CommonJS routers, JSON errors, and the API listener.
const express = require('express');
const cors = require('cors');
const { CORS_ORIGINS } = require('./config');
const { notFound, errorHandler } = require('./middleware/errors');
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '100kb' }));
app.use(require('./routes/publicRoutes'));
app.use(require('./routes/bookingRoutes'));
app.use(require('./routes/userRoutes'));
app.use(require('./routes/listingRoutes'));
app.use(require('./routes/reportRoutes'));
app.use(require('./routes/adminRoutes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
if (require.main === module) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`Firestore marketplace on port ${port}`));
}
