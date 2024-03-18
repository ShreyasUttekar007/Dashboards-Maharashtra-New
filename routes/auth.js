const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const Dashboard = require("../models/PowerBi");

const router = express.Router();
router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, roles, dashboards } = req.body; 
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = new User({ email, password, roles, dashboards });
    await user.save();

    if (dashboards && dashboards.length > 0) {
      await Dashboard.updateMany({ _id: { $in: dashboards } }, { $set: { user: user._id } });
    }

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "1d",
    });
    res.status(201).json({ message: "User created successfully", token });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    user.comparePassword(password, function (err, isMatch) {
      if (err) throw err;
      if (!isMatch) {
        return res.status(401).json({ message: "Authentication failed" });
      }
      const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
        expiresIn: "1d",
      });
      const userObj = {
        email: user.email,
        _id: user._id,
        roles: user.roles,
      };
      console.log("userObj::: ", userObj);
      req.session.token = token;
      console.log('token::: ', token);

      res.cookie("token", token, {
        maxAge: 36000000,
        sameSite: "none",
        secure: true,
        httpOnly: false,
      });
      res.send({ message: "Login success", userObj, token: token });
    });
  } catch (error) {
    next(error);
  }
});

router.put("/update-password", async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.comparePassword(currentPassword, async (err, isMatch) => {
      if (err) throw err;

      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      user.password = newPassword;

      await user.save();
      const newToken = jwt.sign({ userId: user._id }, config.jwtSecret, {
        expiresIn: "1d",
      });

      res.status(200).json({ message: "Password updated successfully", newToken });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/get-users", async (req, res, next) => {
  try {
    const users = await User.find({}, { password: 0 }); 
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});


router.get("/get-dashboard-users", async (req, res, next) => {
  try {
    const { dashboardId } = req.query;
    let users = await User.find({}, { password: 0 });
    
    if (dashboardId) {
      const assignedUsers = await User.find({ dashboards: dashboardId });
      const assignedUserIds = assignedUsers.map(user => user._id);
      users = users.filter(user => !assignedUserIds.includes(user._id));
    }

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});



module.exports = router;
