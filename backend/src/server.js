require("dotenv").config();
const app = require("./app");

const port = Number(process.env.PORT || 4000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Capture Akanksha backend running on http://localhost:${port}`);
  console.log(`LAN devices can use http://<your-lan-ip>:${port}`);
});
