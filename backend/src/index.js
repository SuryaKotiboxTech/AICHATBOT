import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

app.use(cors({}));
app.use(express.json());


app.get("/api/audio-url-latest", (req, res) => {
  const responsesDir = path.join(__dirname, "..", "responses");
  
  const files = fs
  .readdirSync(responsesDir)
  .filter(file => file.endsWith(".mp3"))
  .map(file => ({
    name: file,
    time: fs.statSync(path.join(responsesDir, file)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);
  
  if (!files.length) {
    return res.status(404).json({ error: "No audio files found" });
  }
  
  const latestFile = files[0].name;
  
  res.json({
    audioUrl: `${req.protocol}://${req.get("host")}/responses/${latestFile}`
  });
}); 

console.log("process.env.AWS_REGIONprocess.env.AWS_REGIONprocess.env.AWS_REGIONon Homepage",process.env.AWS_REGION)

app.use(
  "/responses",
  express.static(path.join(__dirname, "..", "responses"))
);
app.get("/api/audio-url/:filename", (req, res) => {
  const { filename } = req.params;

  const filePath = path.join(__dirname, "..", "responses", filename);

  // basic safety check
  if (!filename.endsWith(".mp3")) {
    return res.status(400).json({ error: "Invalid audio file" });
  }

  res.json({
    audioUrl: `${req.protocol}://${req.get("host")}/responses/${filename}`
  });
});

app.use("/api/chat", chatRoutes);


// HTML audio player
app.get("/play/:filename", (req, res) => {
  const { filename } = req.params;

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
        <audio controls autoplay>
          <source src="http://localhost:6000/responses/${filename}" type="audio/mpeg" />
        </audio>
      </body>
    </html>
  `);
});



app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
