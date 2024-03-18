const express = require("express");
const router = express.Router();
const authenticateUser = require("../middleware/authenticateUser");
const PowerBiData = require("../models/PowerBi");
const User = require("../models/User");

router.post("/bi", authenticateUser, async (req, res, next) => {
  try {
    const { name, url } = req.body;
    const newBiData = new PowerBiData({ name, url, user: req.user._id });

    await newBiData.save();
    res.status(201).json({ message: "Power BI URL created successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/get-bi/:userId", authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden - You are not allowed to access this resource",
      });
    }

    const user = await User.findById(userId).populate("dashboards");
    console.log("user::: ", user);

    const dashboardIds = user.dashboards.map((dashboard) => dashboard._id);
    console.log("dashboardIds::: ", dashboardIds);

    const biUrls = await PowerBiData.find({ user: { $in: dashboardIds } });
    console.log("biUrls::: ", biUrls);

    res.status(200).json({ biUrls });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/get-dashboards/:userId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const userRoles = req.user.roles;
      const isAdminOrMod = userRoles.includes("admin") || userRoles.includes("mod");

      let dashboards = [];

      if (isAdminOrMod || req.user._id.toString() === userId) {
        const user = await User.findById(userId).populate("dashboards");
        dashboards = user.dashboards;
      } else {
        return res.status(403).json({
          message: "Forbidden - You are not allowed to access this resource",
        });
      }

      res.status(200).json(dashboards);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/get-all-dashboards", async (req, res, next) => {
  try {
    const dashboards = await PowerBiData.find();
    return res.status(200).json(dashboards);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/assign-dashboards/:userId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { dashboards } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const uniqueDashboards = dashboards.filter(
        (dashboardId) => !user.dashboards.includes(dashboardId)
      );

      user.dashboards = user.dashboards.concat(uniqueDashboards);
      await user.save();

      if (uniqueDashboards.length > 0) {
        await PowerBiData.updateMany(
          { _id: { $in: uniqueDashboards } },
          { $set: { user: user._id } }
        );
      }

      res.status(200).json({ message: "Assigned dashboards updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/assign-dashboard/:dashboardId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const { dashboardId } = req.params;
      const { user } = req.body;

      const dashboard = await PowerBiData.findById(dashboardId);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }

      const promises = user.map(async (userId) => {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: `User with ID ${userId} not found` });
        }
        if (!user.dashboards.includes(dashboardId)) {
          user.dashboards.push(dashboardId);
          await user.save();
        }
      });

      await Promise.all(promises);

      res.status(200).json({ message: "Dashboard assigned to users successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/remove-dashboard-access/:dashboardId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const { dashboardId } = req.params;
      const { user } = req.body;

      const dashboard = await PowerBiData.findById(dashboardId);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }

      const promises = user.map(async (userId) => {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: `User with ID ${userId} not found` });
        }
        user.dashboards = user.dashboards.filter((dashId) => dashId.toString() !== dashboardId);
        await user.save();
      });

      await Promise.all(promises);

      res.status(200).json({ message: "Access to dashboard removed for users successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/delete-dashboard/:dashboardId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const dashboardId = req.params.dashboardId;
      const userRoles = req.user.roles;

      const isAdminOrMod =
        userRoles.includes("admin") || userRoles.includes("mod");

      if (isAdminOrMod) {
        await PowerBiData.findByIdAndDelete(dashboardId);
        res.status(200).json({ message: "Dashboard deleted successfully" });
      } else {
        res.status(403).json({ message: "Unauthorized to delete dashboard" });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/update-dashboard/:dashboardId",
  authenticateUser,
  async (req, res, next) => {
    try {
      const dashboardId = req.params.dashboardId;
      const userRoles = req.user.roles;

      const isAdminOrMod =
        userRoles.includes("admin") || userRoles.includes("mod");

      if (isAdminOrMod) {
        const { name, url } = req.body;
        const updatedDashboard = await PowerBiData.findByIdAndUpdate(
          dashboardId,
          { name, url },
          { new: true }
        );
        res.status(200).json(updatedDashboard);
      } else {
        res.status(403).json({ message: "Unauthorized to update dashboard" });
      }
    } catch (error) {
      next(error);
    }
  }
);
module.exports = router;
