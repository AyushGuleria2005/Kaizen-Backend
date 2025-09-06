import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import OpenAI from "openai";
import cors from "cors"

dotenv.config({
  path: "./.env",
});

const app = express();
// Basic configurations in express
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

//Cors

app.use(cors({
  origin:"http://localhost:5173",
  credentials:true,
  methods:["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

const UrlApiCall = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

app.get("/test", async (req, res) => {
  try {
    console.log(req.query);
    const link = req.query.link;
    const urlData = await UrlApiCall(link);
    res.json({data:urlData});
  } catch (err) {
    console.log(err.message);
  }
});

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});



// fs.writeFile("./preview.html", urlData, (err) => {
//   if (err) {
//     console.log("Error: " + err);
//   } else {
//     console.log("Gaya data");
//   }
// });

app.listen(5678, () => {
  console.log("Server is running at 5878");
});
