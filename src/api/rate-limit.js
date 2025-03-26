const { makeApiRequestForToken } = require("./auth");
const { log, logToFile } = require("../utils");

class RateLimiter {
  constructor(token) {
    this.token = token;
    this.rateLimitInfo = {
      limit: 0,
      remaining: 0,
      resetTime: 0,
      currentUsage: 0,
    };
    this.cooldownActive = false;
    this.cooldownTimer = null;
  }

  async getRateLimit() {
    try {
      log("Checking rate limit...", "info");
      logToFile("Checking rate limit");

      const response = await makeApiRequestForToken(this.token, "GET", "/rate-limit");

      this.rateLimitInfo = {
        limit: response.limit,
        remaining: response.remaining,
        resetTime: response.reset_time,
        currentUsage: response.current_usage || 0,
      };

      let resetTimeFormatted = "N/A";
      if (this.rateLimitInfo.resetTime > 0) {
        const minutes = Math.floor(this.rateLimitInfo.resetTime / 60);
        const seconds = this.rateLimitInfo.resetTime % 60;
        resetTimeFormatted = `${minutes}m ${seconds}s`;
      }

      log(`Rate limit: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} remaining`, "info");
      logToFile("Rate limit status", {
        limit: this.rateLimitInfo.limit,
        remaining: this.rateLimitInfo.remaining,
        resetTime: this.rateLimitInfo.resetTime,
        resetTimeFormatted: resetTimeFormatted,
        currentUsage: this.rateLimitInfo.currentUsage,
      });

      return this.rateLimitInfo;
    } catch (error) {
      throw error;
    }
  }

  async checkRateLimitAvailability() {
    try {
      const { remaining } = await this.getRateLimit();
      const isAvailable = remaining > 0;
      logToFile(`Rate limit availability check: ${isAvailable ? "Available" : "Exhausted"}`, {
        remaining: remaining,
      });
      return isAvailable;
    } catch (error) {
      logToFile(`Error checking rate limit, assuming available: ${error.message}`, { error: error.message }, false);
      return true;
    }
  }
}

module.exports = RateLimiter;
