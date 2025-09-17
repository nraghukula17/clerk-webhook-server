import "dotenv/config";
import app from "./app";

const PORT = parseInt(process.env.PORT || "5050", 10);

// Render requires binding to 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Clerk webhook server running on port ${PORT}`);
});
