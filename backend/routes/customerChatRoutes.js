const express = require("express");
const router = express.Router();
const {
  getOrCreateCustomerChat,
  listCustomerChatsForStore,
  getCustomerChatMessages,
  addCustomerChatMessage,
} = require("../controllers/customerChatController");

router.post("/create", getOrCreateCustomerChat); // body: { customerId, storeId }
router.get("/store/:storeId", listCustomerChatsForStore); // store-level listing for employees
router.get("/:chatId/messages", getCustomerChatMessages);
router.post("/:chatId/messages", addCustomerChatMessage);

module.exports = router;
