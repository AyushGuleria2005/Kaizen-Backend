import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import cors from "cors";
import { SYSTEM_PROMPT } from "./prompts/SYSTEM_PROMPT.js";
import { createServer } from 'node:http';
import { Server } from "socket.io";

dotenv.config({
  path: "./.env",
});


const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const app = express();
const server = createServer(app);
const io = new Server(server);

let linkFrontend;
io.on('connection',(socket)=>{
  console.log("Client connected: "+socket.id);
})

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

// Tools
const UrlApiCall = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

// Api to get the required html from the URL
app.post("/test", async (req, res) => {
  try {
    // http://localhost:5678/test?link=https://www.npmjs.com/package/curl
    const URL = req.body.link // URL from frontend in req.body
    console.log(req.body)
    const TOOL_MAP = {
      UrlApiCall: UrlApiCall,
    };

    //Message History
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
      // Make API call to Gemini to get required code
      const response = await gemini.chat.completions.create({
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
      // console.log(parsedContent)
      // Lets play with parsedContent
      if (parsedContent.step === "START") {
        messages.push({
          role: "user",
          content: "Alright move to next step",
        });
        console.log("🔥 " + parsedContent.details);
        io.emit("start-msg",parsedContent.details)
        continue;
      }
      if (parsedContent.step === "THINK") {
        messages.push({
          role: "user",
          content: "Alright move to next step",
        });
        console.log("😎 " + parsedContent.details);
        io.emit("think-msg",parsedContent.details)
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
          io.emit("tool-msg",parsedContent.details)
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
        // io.emit("output-msg",parsedCode);    
        // console.log(parsedCode)    
        res.json({"code":parsedCode});
        console.log("Code generated 🕺")
        break;
      }
    }
  } catch (err) {
    console.log(err.message);
  }
});

//Listening at port 5678
app.listen(5678, () => {
  console.log("Server is running at 5678");
});
