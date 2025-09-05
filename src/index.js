import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

console.log("Hello " + process.env.SECRET_KEY);
console.log("Revamp");
