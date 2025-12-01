const express = require("express");
const router = express.Router();
const {
  getOrCreateStaffChat,
  listStaffChatsForUser,
  getStaffChatMessages,
  addStaffChatMessage,
} = require("../controllers/staffChatController");

router.post("/create", getOrCreateStaffChat); // body: { userAId, userBId }
router.get("/list", listStaffChatsForUser); // query: userId
router.get("/:chatId/messages", getStaffChatMessages);
router.post("/:chatId/messages", addStaffChatMessage);

module.exports = router;
