const express = require("express");
const router = express.Router();

/**
 * This path returns static information about the project
 */
router.get("/about", (req, res) => {
  res.status(200).send({
    content:
      "This project was developed as part of the web development course. It includes features like recipe search, user registration, and family recipe sharing.",
  });
});

module.exports = router;