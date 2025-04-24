"use strict";
exports.__esModule = true;
var express = require("express");
var authRoutes_1 = require("./src/routes/authRoutes");
var authMiddleware_1 = require("./src/middleware/authMiddleware");
var client_1 = require("@prisma/client");
var app = express();
app.use(express.json());
// Auth routes
app.use('/auth', authRoutes_1["default"]);
// Protected routes example
app.get('/clinic', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC]), function (req, res) {
    res.json({ message: 'Clinic dashboard' });
});
app.get('/pharmacy', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.UserRole.PHARMACY]), function (req, res) {
    res.json({ message: 'Pharmacy dashboard' });
});
app.post('/opdrecord', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)([client_1.UserRole.CLINIC]), function (req, res) {
    res.json({ message: 'OPD record created' });
});
var PORT = process.env.PORT || 3000;
app.listen(PORT,"0.0.0.0", function () {
    console.log("Server is running on port ".concat(PORT));
});
