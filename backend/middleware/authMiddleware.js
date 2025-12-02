const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Employee = require('../models/employeeModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const kind = decoded.kind || 'user';

            // For guest tokens we skip DB lookup (id is not a real ObjectId)
            if (decoded.role === 'guest') {
                req.user = { id: decoded.id, role: 'guest' };
                return next();
            }

            if (kind === 'employee' || decoded.role === 'employee') {
                const employee = await Employee.findById(decoded.id).select('-passwordHash');
                if (!employee || !employee.active) {
                    return res.status(401).json({ message: "Not authorized, employee not found" });
                }
                req.user = {
                    id: employee._id,
                    _id: employee._id,
                    role: 'employee',
                    store: employee.store,
                    employeeRole: employee.role,
                    fullName: employee.fullName,
                    email: employee.email,
                };
                return next();
            }

            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }
            return next();
        } catch (error) {
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

module.exports = { protect };
