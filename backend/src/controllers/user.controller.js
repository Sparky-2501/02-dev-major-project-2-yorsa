import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoose from "mongoose";
import { Meeting } from "../models/meeting.model.js";
import { AttendeeLog } from "../models/attendeeLog.model.js";

// In-memory fallback caches if MongoDB Atlas is offline or buffering
const memUsers = new Map(); // username -> { name, username, password, token }
const memUserMeetings = new Map(); // username -> [{ user_id, meetingCode, roomId, date }]

// login block
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Please Provide necessary fields" });
  }

  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ username });
      } catch (dbErr) {
        console.warn("[User Controller] DB findOne failed, falling back to memory:", dbErr.message);
      }
    }

    if (!user && memUsers.has(username)) {
      user = memUsers.get(username);
    }

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
    }

    let isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (isPasswordCorrect) {
      let token = crypto.randomBytes(20).toString("hex");

      user.token = token;
      memUsers.set(username, user);

      if (mongoose.connection.readyState === 1 && typeof user.save === "function") {
        try {
          await user.save();
        } catch (dbErr) {}
      }

      return res.status(httpStatus.OK).json({ token: token });
    } else {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" });
    }
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong : ${e.message}` });
  }
};

// register block
const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    let existingUser = null;
    if (mongoose.connection.readyState === 1) {
      try {
        existingUser = await User.findOne({ username });
      } catch (dbErr) {}
    }

    if (!existingUser && memUsers.has(username)) {
      existingUser = memUsers.get(username);
    }

    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      username,
      password: hashedPassword,
      token: ""
    };

    memUsers.set(username, userData);

    if (mongoose.connection.readyState === 1) {
      try {
        const newUser = new User(userData);
        await newUser.save();
      } catch (dbErr) {
        console.warn("[User Controller] DB register save failed, persisted in memory:", dbErr.message);
      }
    }

    res.status(httpStatus.CREATED).json({ message: "User Registered" });
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e.message}` });
  }
};

// meeting-history block
const getUserHistory = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "Token is required" });
  }

  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ token });
      } catch (dbErr) {}
    }

    if (!user) {
      for (const u of memUsers.values()) {
        if (u.token === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    let meetings = [];
    if (mongoose.connection.readyState === 1) {
      try {
        meetings = await Meeting.find({ user_id: user.username });
      } catch (dbErr) {}
    }

    const memList = memUserMeetings.get(user.username) || [];
    const merged = [...meetings];
    memList.forEach(m => {
      if (!merged.some(item => (item.meetingCode === m.meetingCode || item.roomId === m.meetingCode))) {
        merged.push(m);
      }
    });

    res.json(merged);
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e.message}` });
  }
};

// add to history block
const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  if (!token) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "Token is required" });
  }

  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ token });
      } catch (dbErr) {}
    }

    if (!user) {
      for (const u of memUsers.values()) {
        if (u.token === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    const meetingRecord = {
      user_id: user.username,
      meetingCode: meeting_code,
      roomId: meeting_code,
      date: new Date()
    };

    let userList = memUserMeetings.get(user.username) || [];
    userList.push(meetingRecord);
    memUserMeetings.set(user.username, userList);

    if (mongoose.connection.readyState === 1) {
      try {
        const newMeeting = new Meeting(meetingRecord);
        await newMeeting.save();
      } catch (dbErr) {}
    }

    res.status(httpStatus.CREATED).json({ message: "Added code to history" });
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e.message}` });
  }
};

const getMeetingAuditLog = async (req, res) => {
  const { token, meeting_code } = req.query;

  if (!token || !meeting_code) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Token and meeting_code are required" });
  }

  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ token });
      } catch (dbErr) {}
    }

    if (!user) {
      for (const u of memUsers.values()) {
        if (u.token === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    let logs = [];
    if (mongoose.connection.readyState === 1) {
      try {
        logs = await AttendeeLog.find({ meetingCode: meeting_code }).sort({ joinTime: 1 });
      } catch (dbErr) {}
    }

    res.json(logs);
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e.message}` });
  }
};

export { login, register, getUserHistory, addToHistory, getMeetingAuditLog };

