const mongoose = require("mongoose");
const { Schema } = mongoose;

const DashboardSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Dashboard = mongoose.model("Dashboard", DashboardSchema);

module.exports = Dashboard;
