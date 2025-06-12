const { spawn } = require("child_process");
const { readFileSync } = require("fs-extra");
const fs = require("fs");
const axios = require("axios");
var deviceID = require('uuid');
var adid = require('uuid');
const totp = require('totp-generator');
const semver = require("semver");
const logger = require("./utils/log");
const chalk = require('chalk');
const chalk1 = require('chalkercli');
const gradient = require('gradient-string');
const moment = require("moment-timezone");
const FacebookAuth = require('./auth');
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const auth = new FacebookAuth({
  ACCESSTOKEN: '' // Có thể để trống
});

const credentials = {
  email: '100087156370939',
  password: 'rkwnrqprwcw',
  otpKey: '' // Nếu có bảo mật 2 lớp
};

var job = [
  "FF9900", "FFFF33", "33FFFF", "FF99FF", "FF3366", "FFFF66", "FF00FF", "66FF99", "00CCFF", "FF0099", "FF0066", "0033FF", "FF9999", "00FF66", "00FFFF", "CCFFFF", "8F00FF", "FF00CC", "FF0000", "FF1100", "FF3300", "FF4400", "FF5500", "FF6600", "FF7700", "FF8800", "FF9900", "FFaa00", "FFbb00", "FFcc00", "FFdd00", "FFee00", "FFff00", "FFee00", "FFdd00", "FFcc00", "FFbb00", "FFaa00", "FF9900", "FF8800", "FF7700", "FF6600", "FF5500", "FF4400", "FF3300", "FF2200", "FF1100"
];
var random =
  job[Math.floor(Math.random() * job.length)]



///////////////////////////////////////
////////// CHECK LỖI MODULES //////////
///////////////////////////////////////
try {
  var files = fs.readdirSync('./modules/commands');
  files.forEach(file => {
    if (file.endsWith('.js')) {
      require(`./modules/commands/${file}`);
    }
  });
  logger('Tiến Hành Check Lỗi', '[ AUTO-CHECK ]');
  logger('Các Modules Hiện Không Có Lỗi', '[ AUTO-CHECK ]');
} catch (error) {
  logger('Đã Có Lỗi Tại Lệnh:', '[ AUTO-CHECK ]');
  console.log(error);
}
function startBot(message) {
  (message) ? logger(message, "[ Bắt đầu ]") : "";

  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "mirai.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });
  child.on("close", (codeExit) => {
    if (codeExit != 0 || global.countRestart && global.countRestart < 5) {
      startBot("Mirai Loading - Tiến Hành Khởi Động Lại");
      global.countRestart += 1;
      return;
    } else return;
  });

  child.on("error", function (error) {
    logger("Đã xảy ra lỗi: " + JSON.stringify(error), "[ Bắt đầu ]");
  });
};
function restartApp() {
  console.log("🔄 Đang restart lại node index.js...");
  spawn('node', ['index.js'], {
    stdio: 'inherit',  // Kế thừa console của process cũ
    shell: true
  });
  process.exit(); // Thoát process hiện tại để restart lại
}
/////////////////////////////////////
const logo = `MIRAIBOT`;
function getRandomColors() {
  const colors1 = ["FFFFFF", "FFEBCD", "F5F5DC", "F0FFF0", "F5FFFA", "F0FFFF", "F0F8FF", "FFF5EE", "F5F5F5", "FF9900", "FFFF33", "33FFFF", "FF99FF", "FF3366", "FFFF66", "FF00FF", "66FF99", "00CCFF", "FF0099", "FF0066", "0033FF", "FF9999", "00FF66", "00FFFF", "CCFFFF", "8F00FF", "FF00CC", "FF0000", "FF1100", "FF3300", "FF4400", "FF5500", "FF6600", "FF7700", "FF8800", "FF9900", "FFaa00", "FFbb00", "FFcc00", "FFdd00", "FFee00", "FFff00", "FFee00", "FFdd00", "FFcc00", "FFbb00", "FFaa00", "FF9900", "FF8800", "FF7700", "FF6600", "FF5500", "FF4400", "FF3300", "FF2200", "FF1100"];
  const colors = colors1.filter(color => {
    if (color === "FF0000") {
      return "FF9900";
    } else {
      const hue = parseInt(color.substring(0, 2), 16);
      const saturation = parseInt(color.substring(2, 4), 16);
      const lightness = parseInt(color.substring(4, 6), 16);
      if (hue >= 10 && hue <= 30 && saturation >= 80 && lightness >= 70) {
        return false;
      } else {
        return true;
      }
    }
  });
  const randomColors = [];
  while (randomColors.length < 2) {
    const randomIndex = Math.floor(Math.random() * colors.length);
    const randomColor = colors[randomIndex];
    if (!randomColors.includes(randomColor)) {
      randomColors.push(randomColor);
    }
  }
  return randomColors;
}
const randomColors = getRandomColors();
const coloredData = gradient(...randomColors).multiline(logo);
console.log(chalk(coloredData));
////////////////////////////////////////////
const config = require("./config.json")
async function startb() {
  if (config.ACCESSTOKEN !== "") {
    startBot();
  } else {
    auth.login(credentials)
      .then(result => {
        if (result.success) {
          console.log('Access Token:', result.accessToken);
          console.log('UID:', result.uid);
          console.log('Cookies:', result.cookies);
          const filePath = "appstate.json"
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(result.cookies, null, 2), 'utf8');
            console.log("📄 File mới đã được tạo!");
            restartApp();
          }
        } else {
          console.error('Login failed:', result.error);
        }
      });
    setTimeout(() => {
      startBot();
    }, 7000)
  }
}
startb()
