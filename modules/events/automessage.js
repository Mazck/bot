const { readFileSync } = require("fs-extra");
const { resolve } = require("path");
const axios = require("axios");

// Cron parser function
function parseCron(cronExpression) {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return null;
    
    return {
        minute: parts[0],
        hour: parts[1],
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4]
    };
}

function matchCronPart(value, cronPart) {
    if (cronPart === '*') return true;
    if (cronPart.includes('/')) {
        const [range, step] = cronPart.split('/');
        const stepNum = parseInt(step);
        if (range === '*') return value % stepNum === 0;
        const [start, end] = range.split('-').map(Number);
        if (value >= start && value <= end) {
            return (value - start) % stepNum === 0;
        }
        return false;
    }
    if (cronPart.includes('-')) {
        const [start, end] = cronPart.split('-').map(Number);
        return value >= start && value <= end;
    }
    if (cronPart.includes(',')) {
        const values = cronPart.split(',').map(Number);
        return values.includes(value);
    }
    return parseInt(cronPart) === value;
}

function shouldRun(cronExpression) {
    const cron = parseCron(cronExpression);
    if (!cron) return false;
    
    const now = new Date();
    const minute = now.getMinutes();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1;
    const dayOfWeek = now.getDay();
    
    return (
        matchCronPart(minute, cron.minute) &&
        matchCronPart(hour, cron.hour) &&
        matchCronPart(dayOfMonth, cron.dayOfMonth) &&
        matchCronPart(month, cron.month) &&
        matchCronPart(dayOfWeek, cron.dayOfWeek)
    );
}

// Download media function
async function downloadMedia(url, filename) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        
        const fs = require('fs');
        const path = require('path');
        const downloadPath = path.resolve(__dirname, '../temp', filename);
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(path.dirname(downloadPath))) {
            fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
        }
        
        const writer = fs.createWriteStream(downloadPath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(downloadPath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.log('[AutoMessage] Error downloading media:', error);
        return null;
    }
}

// Get target thread IDs based on message target config
function getTargetThreadIDs(message, allThreadIDs) {
    if (!message.target) {
        // Default to current thread if no target specified (backward compatibility)
        return [message.threadID || message.target?.threadIDs?.[0]];
    }
    
    switch (message.target.type) {
        case "current":
            return message.target.threadIDs || [];
            
        case "all":
            if (global.data && Array.isArray(global.data.allThreadID)) {
                return global.data.allThreadID;
            }
            return allThreadIDs || [];
            
        case "specific":
            return message.target.threadIDs || [];
            
        default:
            return [message.threadID];
    }
}

// Send auto message function
async function sendAutoMessage(api, threadIDs, message) {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    try {
        let sendOptions = {};
        let attachments = [];
        
        // Prepare media attachments
        if (message.mediaUrls && message.mediaUrls.length > 0) {
            for (let i = 0; i < message.mediaUrls.length; i++) {
                const url = message.mediaUrls[i];
                const extension = url.split('.').pop().split('?')[0];
                const filename = `automessage_${Date.now()}_${i}.${extension}`;
                
                const downloadedPath = await downloadMedia(url, filename);
                if (downloadedPath) {
                    const fs = require('fs');
                    attachments.push(fs.createReadStream(downloadedPath));
                }
            }
        }
        
        // Prepare send options
        if (attachments.length > 0) {
            sendOptions.attachment = attachments;
        }
        if (message.content) {
            sendOptions.body = message.content;
        }
        
        // Send to each target thread
        for (const threadID of threadIDs) {
            try {
                if (message.type === "text" && !message.content) {
                    // Skip if text type but no content
                    continue;
                }
                
                // Clone attachments for each send (needed for multiple sends)
                let threadSendOptions = { ...sendOptions };
                if (attachments.length > 0) {
                    threadSendOptions.attachment = attachments.map(stream => {
                        // Create new read stream for each thread to avoid conflicts
                        const fs = require('fs');
                        return fs.createReadStream(stream.path);
                    });
                }
                
                await new Promise((resolve, reject) => {
                    api.sendMessage(threadSendOptions, threadID, (error, info) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(info);
                        }
                    });
                });
                
                results.success++;
                console.log(`[AutoMessage] ✅ Sent message [${message.id}] to thread ${threadID}`);
                
                // Add delay between sends to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.failed++;
                results.errors.push({
                    threadID,
                    error: error.message
                });
                console.log(`[AutoMessage] ❌ Failed to send to thread ${threadID}:`, error.message);
            }
        }
        
    } catch (error) {
        console.log('[AutoMessage] Error in sendAutoMessage:', error);
        results.failed = threadIDs.length;
        results.errors.push({
            threadID: 'all',
            error: error.message
        });
    }
    
    return results;
}

// Clean up temp files
function cleanupTempFiles() {
    try {
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.resolve(__dirname, '../temp');
        
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const ageInMinutes = (now - stats.birthtime.getTime()) / (1000 * 60);
                
                // Delete files older than 30 minutes
                if (ageInMinutes > 30) {
                    fs.unlinkSync(filePath);
                    console.log(`[AutoMessage] 🧹 Cleaned up temp file: ${file}`);
                }
            });
        }
    } catch (error) {
        console.log('[AutoMessage] Error cleaning temp files:', error);
    }
}

// Collect all unique thread IDs from all auto messages
function getAllUniqueThreadIDs(allData) {
    const threadIDs = new Set();
    
    for (const threadData of allData) {
        threadIDs.add(threadData.threadID);
        
        for (const message of threadData.messages) {
            if (message.target) {
                if (message.target.threadIDs && Array.isArray(message.target.threadIDs)) {
                    message.target.threadIDs.forEach(id => threadIDs.add(id));
                }
            }
        }
    }
    
    return Array.from(threadIDs);
}

// Main check function
async function checkAndSendAutoMessages(api) {
    try {
        const path = resolve(__dirname, "../cache", "automessage.json");
        
        if (!require('fs').existsSync(path)) return;
        
        const data = JSON.parse(readFileSync(path, "utf-8"));
        const now = new Date();
        
        // Get all available thread IDs
        const allAvailableThreads = getAllUniqueThreadIDs(data);
        
        let totalSent = 0;
        let totalFailed = 0;
        
        for (const threadData of data) {
            for (const message of threadData.messages) {
                if (!message.active) continue;
                
                if (shouldRun(message.time)) {
                    console.log(`[AutoMessage] 📅 Processing scheduled message [${message.id}] from thread ${threadData.threadID}`);
                    
                    // Get target thread IDs
                    const targetThreadIDs = getTargetThreadIDs(message, allAvailableThreads);
                    
                    if (targetThreadIDs.length === 0) {
                        console.log(`[AutoMessage] ⚠️ No target threads found for message [${message.id}]`);
                        continue;
                    }
                    
                    console.log(`[AutoMessage] 🎯 Sending to ${targetThreadIDs.length} thread(s): ${targetThreadIDs.join(', ')}`);
                    
                    // Send message to target threads
                    const results = await sendAutoMessage(api, targetThreadIDs, message);
                    
                    totalSent += results.success;
                    totalFailed += results.failed;
                    
                    // Log results
                    if (results.success > 0) {
                        console.log(`[AutoMessage] ✅ Successfully sent to ${results.success} thread(s)`);
                    }
                    if (results.failed > 0) {
                        console.log(`[AutoMessage] ❌ Failed to send to ${results.failed} thread(s)`);
                        results.errors.forEach(error => {
                            console.log(`[AutoMessage] 📋 Error for thread ${error.threadID}: ${error.error}`);
                        });
                    }
                    
                    // Add delay between different messages
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // Log summary if any messages were processed
        if (totalSent > 0 || totalFailed > 0) {
            console.log(`[AutoMessage] 📊 Summary - Sent: ${totalSent}, Failed: ${totalFailed}`);
        }
        
        // Clean up temp files every hour (when minutes = 0)
        if (now.getMinutes() === 0) {
            cleanupTempFiles();
        }
        
    } catch (error) {
        console.log('[AutoMessage] Error in checkAndSendAutoMessages:', error);
    }
}

// Get thread info for logging
async function getThreadName(api, threadID) {
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        return threadInfo.threadName || `Thread ${threadID}`;
    } catch (error) {
        return `Thread ${threadID}`;
    }
}

module.exports = ({ api, models, Users, Threads, Currencies }) => {
    // Check every minute
    setInterval(() => {
        checkAndSendAutoMessages(api);
    }, 60000); // 60 seconds = 1 minute
    
    console.log('[AutoMessage] 🚀 Listen module loaded successfully!');
    console.log('[AutoMessage] 📍 Features: Multi-thread support, Natural time parsing, Media handling');
    
    // Log available threads on startup
    setTimeout(async () => {
        if (global.data && Array.isArray(global.data.allThreadID)) {
            console.log(`[AutoMessage] 📊 Bot is active in ${global.data.allThreadID.length} thread(s)`);
            
            // Log first few thread names for reference
            const maxLog = Math.min(5, global.data.allThreadID.length);
            for (let i = 0; i < maxLog; i++) {
                const threadID = global.data.allThreadID[i];
                const threadName = await getThreadName(api, threadID);
                console.log(`[AutoMessage] 📋 ${i + 1}. ${threadName} (${threadID})`);
            }
            
            if (global.data.allThreadID.length > 5) {
                console.log(`[AutoMessage] 📋 ... and ${global.data.allThreadID.length - 5} more thread(s)`);
            }
        } else {
            console.log('[AutoMessage] ⚠️ global.data.allThreadID not available - multi-thread features limited');
        }
    }, 5000);
    
    // Log current time for debugging (every minute)
    setInterval(() => {
        const now = new Date();
        if (now.getSeconds() === 0) {
            console.log(`[AutoMessage] 🕐 Current time: ${now.toLocaleString()}`);
        }
    }, 1000);
};