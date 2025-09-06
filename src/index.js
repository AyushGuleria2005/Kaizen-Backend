import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import OpenAI from "openai";
import cors from "cors";
import { SYSTEM_PROMPT } from "./prompts/SYSTEM_PROMPT.js";

dotenv.config({
  path: "./.env",
});

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const app = express();
// Basic configurations in express
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

//Cors
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const UrlApiCall = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

// Api to get the reqd html from the url coming from frontend
app.get("/test", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const URL = req.query.link; // Link coming from frontend

    const TOOL_MAP = {
      UrlApiCall: UrlApiCall,
    };

    // const urlData = await UrlApiCall(link);   // why tf we are doing fc
    // res.json({ data: urlData }); // urlData.data.data. => HTML
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Revamp the design of ${URL}`,
      },
    ];
    while (true) {
      // Make an API call to LLM so that it gives me required code
      const response = await openai.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: messages,
      });
      const rawContent = response.choices[0].message.content; // JSON string
      // "{\"step\":\"START\",\"details\":\"The user wants to redesign https://www.monginis.net/\"}"
      const parsedContent = JSON.parse(rawContent); // JS object
      // { step: 'START', details: 'The user wants to redesign https://www.monginis.net/'}
      messages.push({
        role: "assistant",
        content: JSON.stringify(parsedContent),
      });
      res.write(`${rawContent}\n\n`);
      // console.log(parsedContent)
      // Lets play with parsedContent
      if (parsedContent.step === "START") {
        messages.push({
          role: "user",
          content: "Alright move to next step",
        });
        console.log("🔥 " + parsedContent.details);
        continue;
      }
      if (parsedContent.step === "THINK") {
        messages.push({
          role: "user",
          content: "Alright move to next step",
        });
        console.log("😎 " + parsedContent.details);
        continue;
      }
      if (parsedContent.step === "TOOL") {
        const toolToCall = parsedContent.tool_name;
        // If tool not found
        // if (!TOOL_MAP[toolToCall]) {
        //   messages.push({
        //     role: "developer",
        //     content: "There is no such tool",
        //   });
        //   continue;
        // }
        const toolResponse = await UrlApiCall(parsedContent.input);
        if (toolToCall === "UrlApiCall") {
          console.log(`👼 Analyzing the website....`);
        } 
        messages.push({
          role: "user",
          content: JSON.stringify({
            step: "OBSERVER",
            content: String(toolResponse),
          }),
        });
        continue;
      }

      if (parsedContent.step === "OUTPUT") {
        const parsedCode = parsedContent.details;
        console.log(parsedCode);
        res.end();
        break;
      }
    }
  } catch (err) {
    console.log(err.message);
  }
});

app.listen(5678, () => {
  console.log("Server is running at 5878");
});
